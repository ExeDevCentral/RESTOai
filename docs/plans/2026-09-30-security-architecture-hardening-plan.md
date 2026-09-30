# KOBE / RESTOia Security Architecture Hardening Plan

**Date:** 2026-09-30  
**Status:** Proposed; implementation not started  
**Scope:** Repository architecture and application security, based on static source review. This is not a penetration-test attestation or a production configuration review.

## Goal

Make every sensitive operation attributable to an authenticated principal, authorized within the principal's organization and location, validated at the API boundary, and committed to durable storage with a tamper-evident audit record.

## Executive Risk

**Current disposition: do not expose the current API to an untrusted network or treat it as production-ready.** The Express app binds to all interfaces, mounts read and write routers without authentication, and accepts caller-supplied role context on critical flows. If reachable, an unauthenticated caller can read business data and attempt order, inventory, cash, AI, or print operations.

The code describes multi-tenant RLS and an immutable audit ledger, but the running server uses a shared JSON file, a `pg-mem` database, and an in-process audit array. The SQL shown enables RLS only for `locations`; current tests exercise in-memory filtering rather than PostgreSQL policy enforcement.

## Verified Findings

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| P0 | No API authentication boundary | Routers are mounted directly after global middleware; no authentication middleware is present in `server/`. The process binds to `0.0.0.0`. An unauthenticated caller can reach operational and sensitive routes. See [server/index.js](../../server/index.js#L19). |
| P0 | Caller-controlled privilege elevation | Cash close and order void/discount derive the acting role from `req.body`, re-register a manager role, and use the hard-coded supervisor PIN `1234`. The role is an assertion from the caller, not an authenticated identity. See [cash.js](../../server/routes/cash.js#L139) and [orders.js](../../server/routes/orders.js#L415). |
| P0 | AI endpoint trusts caller role and defaults to manager | `/api/ai/chat` forwards caller-provided context; the engine defaults missing roles to `MANAGER` and can settle tables or create orders. This makes conversational input an alternate privileged write path. See [common.js](../../server/routes/common.js#L44) and [aiEngine.js](../../server/aiEngine.js#L132). |
| P0 | Tenant and location context are constants, not principal-derived | Route handlers use fixed organization/location/actor identifiers. Records in the JSON store have no enforced tenant boundary. RLS is enabled only on `locations`, not orders, cash, stock, reservations, audit, or other sensitive tables. See [tenancy.sql](../../packages/db/src/schema/tenancy.sql#L108) and [db.js](../../server/db.js#L254). |
| P1 | Critical state is not durably or atomically stored | Business state is synchronously overwritten as one JSON file while Drizzle is initialized with `pg-mem`; the audit ledger is a static in-memory array. Restart loses the in-memory database and audit chain; partial failures can leave JSON, relational data, and audit state inconsistent. See [db.js](../../server/db.js#L232) and [auditLedger.ts](../../packages/domain/src/auditLedger.ts#L19). |
| P1 | API accepts financially authoritative client values | Order item names, quantities, prices, table, and waiter are taken from the request; monetary values are converted through JavaScript `Number` before being represented as cents. A caller can forge prices or quantities and floating-point rounding can undermine the BigInt invariant. See [orders.js](../../server/routes/orders.js#L124). |
| P1 | Inventory and cash writes bypass enforceable permissions | Inventory adjustment directly mutates quantity. Cash movement/open routes have no route-level identity or permission check. Role checks in selected critical flows do not compensate for unprotected ordinary mutations. See [inventory.js](../../server/routes/inventory.js#L44) and [cash.js](../../server/routes/cash.js#L20). |
| P1 | Audit is neither authoritative nor fail-closed | Mutations can be saved before an audit append; several audit errors are caught and ignored. The ledger is in-process memory, and `Object.freeze` is shallow. The public audit endpoint exposes the whole ledger. See [common.js](../../server/routes/common.js#L92) and [auditLedger.ts](../../packages/domain/src/auditLedger.ts#L19). |
| P1 | Unauthenticated disclosure and physical side effects | Read routes expose orders, invoices, cash, analytics, reservations (including phone numbers), and audit data. Print jobs accept `openDrawer` from the request and can dispatch to configured printers. |
| P1 | Dependency advisory in locked tree | `npm audit --omit=dev` reports one high-severity `drizzle-orm` SQL identifier injection advisory (GHSA-gpj5-g38j-94v9); affected versions are below 0.45.2. Resolve with a reviewed compatible upgrade, not `npm audit fix --force` without testing. |
| P2 | Weak API resource controls | `cors()` is unrestricted and `express.json()` has no explicit size limit; no rate limiting, security-header policy, or centralized input schemas were found in the server entry path. This increases abuse, resource exhaustion, and browser-origin exposure risk. |
| P2 | Security test boundary is missing | Current suite passes 67 tests across 25 files, but the reviewed test set covers domain and in-memory DB behavior rather than HTTP authentication, authorization, tenant isolation against real PostgreSQL, or route abuse cases. |

### STRIDE Summary

- **Spoofing / elevation:** unauthenticated routes, body-supplied roles, default AI manager role, shared supervisor PIN.
- **Tampering / repudiation:** forged order data, direct mutable JSON state, swallowed audit failures, ephemeral hash chain.
- **Information disclosure:** tenant-wide order, invoice, cash, reservation, analytics, and audit reads without authorization.
- **Denial of service:** unbounded request body and no rate/resource limits; synchronous full-file reads/writes block the event loop.
- **Physical/operational impact:** unauthorized stock/cash changes and printer jobs, including drawer-open requests.

## Target Security Architecture

1. **Edge:** TLS termination at a trusted reverse proxy; app listens only on the intended private interface. Explicit CORS origin allowlist, request/body/time limits, security headers, and edge/API rate limits.
2. **Identity:** OIDC/OAuth 2.1 authorization-code flow with PKCE for interactive clients; API validates issuer, audience, signature, expiry, and revocation/session policy. Passwords, refresh tokens, and service credentials are never accepted as caller identity claims.
3. **Authorization:** construct an immutable request principal from verified identity and current database memberships. Resolve organization/location scope server-side. Apply route permission checks and domain invariants; never accept `role`, `actorId`, organization, or location as authorization evidence from request bodies.
4. **Data boundary:** Zod parses every external payload from `unknown`; reject unknown fields where appropriate. Derive price, product identity, tax, and tenant scope from trusted server-side records.
5. **Persistence:** production PostgreSQL with migrations, least-privilege roles, transaction-local tenant context, RLS on every tenant-owned table, and `FORCE ROW LEVEL SECURITY` where appropriate. Test with PostgreSQL, not only `pg-mem` or array filters.
6. **Transactions and audit:** commit business mutation and audit/outbox event atomically. Persist append-only audit records and protect them with DB permissions/triggers plus independently verifiable hash chaining. Fail closed if a required audit write fails.
7. **Side-effect boundaries:** AI may propose typed commands but cannot bypass the same authorization/domain services as HTTP. Printing is an authorized outbox operation; drawer opening is a separately permissioned action and printer destinations are deployment-controlled.

## Delivery Roadmap

### Phase 0: Containment and Exposure Decision

- [ ] Keep the server off public/untrusted networks until P0 controls land; temporarily bind to loopback or restrict access with host firewall/VPN.
- [ ] Disable or protect `/api/ai/chat`, `/api/kobe/audit`, cash close, void/discount, and print-job routes at the edge until application authorization is in place.
- [ ] Remove the `1234` supervisor credential and every request-time manager-role registration. Rotate any equivalent credentials if they have been used outside local development.
- [ ] Document the intended deployment topology, trust zones, data classification, supported client types, and recovery objectives.

**Exit:** a network inventory confirms only explicitly trusted clients can reach the service; no default/shared privileged credential remains.

### Phase 1: Identity, Authorization, and Tenant Scope

- [ ] Define identity and membership contracts: user, organization membership, location membership, session/token lifecycle, role/permission mapping, and service identities.
- [ ] Add authentication middleware before all protected routers. Return `401` for missing/invalid identity; return `403` for authenticated but unauthorized actions.
- [ ] Build a request principal from verified claims plus current membership lookup. Make actor, organization, and location immutable server-derived context.
- [ ] Replace body-controlled `role`, actor, tenant, location, and PIN decisions with permission checks such as `orders:void`, `cash:close`, `inventory:adjust`, `audit:read`, and `system:printers`.
- [ ] Apply deny-by-default route policy to every method, including reads, exports, invoices, printer discovery, health/debug endpoints, and AI.
- [ ] Add HTTP integration tests first: anonymous reads/writes fail; fabricated role/PIN claims do not elevate; wrong-tenant and wrong-location access is denied; organization-scoped roles work only where explicitly intended.

**Exit:** every route has an explicit access policy and API tests prove identity/role spoofing and cross-tenant requests fail.

### Phase 2: PostgreSQL Tenancy and Data Isolation

- [ ] Replace `server/data.json` and `pg-mem` runtime wiring with a production PostgreSQL adapter and versioned migrations. Keep memory DB use restricted to unit tests.
- [ ] Add organization/location ownership and membership constraints to every tenant-owned table; add RLS policies for orders/items, cash, inventory/lots, reservations, audit, payments, print jobs, and fiscal records.
- [ ] Set tenant/location/user context inside each database transaction using transaction-local settings; clear/replace context for every pooled connection checkout. Use separate migration and application DB roles.
- [ ] Validate foreign keys prevent mismatched `organization_id` and `location_id`; test inactive locations and revoked memberships.
- [ ] Replace array-filter tenancy tests with integration tests against actual PostgreSQL roles and policies, including connection-pool context leakage tests.

**Exit:** direct SQL using the app role cannot read or mutate another tenant/location, and the same tests pass after connection reuse.

### Phase 3: Transactional Domain Writes and Financial Integrity

- [ ] Establish one service/use-case write path for order creation, status transition, void/discount, payment, cash movement, inventory adjustment/receipt, and invoice issuance.
- [ ] Parse all requests through Zod schemas; enforce payload limits, enums, integer quantities, maximum item counts, notes lengths, and unknown-field policy.
- [ ] Resolve menu items and prices from the database; calculate totals, tax, and split payments with `bigint` cents end-to-end. Never accept client totals as authoritative and never use `Number` for money.
- [ ] Make state transitions, stock reservation/FEFO consumption, payments, and cash movement conditional and transactional; add idempotency keys and concurrency tests for retries/double settlement.
- [ ] Keep inventory ledger movements append-only; replace direct `currentQuantity` mutation with a derived balance/projection updated transactionally.
- [ ] Enforce accounting debit/credit equality at the transaction boundary and persist reversal entries rather than editing settled records.

**Exit:** forged prices/totals, negative or fractional quantities, duplicate payment, invalid transition, and concurrent stock/payment races are rejected or handled idempotently; all persisted amounts are integer cents.

### Phase 4: Audit, Payments, Fiscal, and External Integrations

- [ ] Persist audit records in PostgreSQL with actor, tenant, location, request/correlation ID, action, entity, timestamp, and canonicalized payload. Restrict update/delete at database level.
- [ ] Commit audit/outbox rows with each sensitive state change. Do not catch-and-ignore required audit errors; roll back the business transaction.
- [ ] Canonicalize hash input and verify ordering/concurrency semantics. Add restart, concurrent append, payload mutation, and tampering tests; periodically anchor chain heads outside the primary DB.
- [ ] Validate payment-provider webhook signature, timestamp/replay window, event schema, idempotency, and amount/currency/order match. A webhook payload alone must not authorize a state transition.
- [ ] Replace mock fiscal provider use in production routes with an explicit environment-selected provider; prohibit issuing legal-looking invoices from mock CAE/data.
- [ ] Minimize PII in audit payloads/logs; redact buyer/contact data and define retention and access permissions.

**Exit:** payment and invoice states reconcile to signed provider events and durable ledgers; audit survives restart and any failed audit write rolls back the state change.

### Phase 5: AI, Printing, and Operational Side Effects

- [ ] Remove request-context role defaults from the AI engine. AI tools receive the authenticated principal and call existing authorized domain use cases only.
- [ ] Separate read tools from write tools; require explicit confirmation for payment, void, discount, cash, inventory, invoice, and drawer actions. Treat prompts and retrieved context as untrusted data.
- [ ] Add tests proving prompt injection or caller-supplied role text cannot increase permissions and AI cannot directly mutate persistence.
- [ ] Require permission and idempotency for print jobs. `openDrawer` requires a separate cashier permission plus recent step-up confirmation; default deny.
- [ ] Keep printer address/transport configuration server-managed and allowlisted; prevent request data from choosing arbitrary network destinations. Bound payload size and retry count; audit job lifecycle.

**Exit:** AI cannot perform an operation the principal could not invoke directly; print jobs cannot open drawers or reach unapproved destinations without explicit authorization.

### Phase 6: API Hardening, Privacy, and Abuse Controls

- [ ] Configure explicit CORS origins and methods; add CSP, HSTS at TLS edge, `X-Content-Type-Options`, `Referrer-Policy`, and frame protections appropriate to the UI.
- [ ] Set JSON/form body limits, request timeouts, concurrency/resource limits, per-principal and per-IP rate limits, and stricter limits for login, AI, audit export, and printer routes.
- [ ] Normalize errors and ensure responses never expose stack traces, DB details, provider secrets, internal printer topology, or cross-tenant records.
- [ ] Audit reservation/contact retention, access logging, export controls, encryption in transit/at rest, backup encryption, restore drills, and data deletion workflows.
- [ ] Add structured security events for login failures, authorization denials, tenant-scope violations, webhook failures, audit failures, and privileged actions; exclude credentials and unnecessary PII.

**Exit:** automated API tests verify CORS, headers, size limits, throttling, privacy-safe errors, and security-event emission.

### Phase 7: Supply Chain, CI Gates, and Release Verification

- [ ] Upgrade `drizzle-orm` to a patched version at or above 0.45.2 after reviewing breaking changes and running typecheck, migration, integration, and regression tests. Preserve and review the lockfile diff.
- [ ] Add CI gates for `npm audit`/OSV, secret scanning, SAST, dependency/license inventory, lockfile integrity, tests, typecheck, and migration validation. Pin CI actions and use least-privilege workflow permissions.
- [ ] Add isolated staging deployment and authenticated DAST/API tests; do not scan production without explicit scope and rate limits.
- [ ] Run threat-model review and security regression suite for each auth, tenancy, payment, printer, or audit change.
- [ ] Complete backup restore, key rotation, incident response, revocation, and rollback exercises before production rollout.

**Exit:** a release candidate passes the security pipeline, has no unresolved critical/high findings without a named risk owner and expiry, and its deployed revision is verified in staging.

## Verification Gates

1. **Route authorization:** enumerate all Express routes and assert each has an access policy; test `401`, `403`, tenant mismatch, location mismatch, and attempted role spoofing.
2. **Real RLS:** run integration tests against PostgreSQL with the exact production application role; verify policies for every tenant-owned table and pooled-connection isolation.
3. **Money and transactions:** use boundary, property, retry, and concurrency tests for cent arithmetic, balanced journals, idempotency, stock, refunds, and invoice transitions.
4. **Audit:** assert every sensitive mutation and its audit/outbox record commit or roll back together; verify chain integrity after restart and concurrent writes.
5. **Abuse and privacy:** verify rate/body limits, CORS allowlist, security headers, error redaction, PII access controls, and secret-free logs.
6. **Release:** run `npm test`, `npm run typecheck`, `npm run lint`, production dependency audit, secret scan, SAST, migration checks, authenticated staging smoke tests, and restore/rollback drill.

## Not Verified in This Review

- No production deployment, reverse proxy, firewall, TLS, identity provider, real PostgreSQL instance, secrets store, or printer agent was available for configuration review.
- SonarQube analysis was unavailable because this workspace is not bound to a SonarQube project.
- Secret detection was run against the suspicious credential/authorization snippet; it did not report a detector-classified secret. The hard-coded numeric supervisor PIN is nevertheless directly visible and must be removed.
- No DAST or penetration test was run. The test suite baseline passed 67/67 tests, but this does not demonstrate HTTP security or production isolation.

## Decision Needed Before Implementation

Choose the intended identity provider and deployment boundary (local single-site LAN, hosted multi-tenant SaaS, or both). The plan assumes hosted multi-tenant operation because that is the documented KOBE target; local-only deployments still require authenticated staff identity and cannot rely on network location as authorization.
