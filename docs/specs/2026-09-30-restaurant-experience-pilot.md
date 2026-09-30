# Restaurant Experience Pilot

**Status:** Pilot design approved; implementation in progress  
**Date:** 2026-09-30  
**Scope:** One location, staff workflow first, optional customer menu second, operational measurement throughout.

## Goal

Improve service speed and clarity without removing human hospitality. Stabilize the staff order flow, offer customers an optional digital menu, and use measured results to decide whether to expand.

## Confirmed Decisions

- Prioritize customers and frontline operations together, in the sequence: POS/KDS first, customer digital experience second, measurement before expansion.
- Pilot one restaurant location before rolling changes out across the chain.
- QR use is optional; a printed menu and waiter-assisted service remain available.
- In the pilot, customer-submitted item requests must be reviewed and confirmed by a waiter before dispatch to the kitchen.
- The manager dashboard is for process improvement, not individual staff surveillance or ranking.
- Do not include payment through QR or AI-triggered writes in this pilot.

## Assumptions

- The pilot site has staff tablets and a kitchen display; the site and owner are still to be selected.
- Brief network outages are possible. Staff must see whether orders are online, queued, or synchronized; retries must not duplicate orders.
- Initial deployment is one location, with location dimensions preserved for later chain-wide reporting.
- Proposed interaction target: common staff actions respond within 300 ms on the local network; KDS changes appear within 2 seconds. Validate these targets on actual devices before release.
- Customer menu browsing does not require identity or contact data. Feedback is anonymous by default.
- Accessible touch targets, readable text, and status cues that do not rely on color alone are required.

## Experience

### Staff: POS and KDS

POS home prioritizes tables, active orders, and checks requested. A table order follows: add products and modifiers, review a clear item/quantity/total summary, then send. KDS groups tickets by status and station and prioritizes the oldest waiting orders. Elapsed wait and delay state stay visible. Marking a ticket ready provides a visible cue to the floor staff. Unavailable dishes must not be newly ordered.

### Customer: Optional digital menu

An optional table QR opens a responsive menu with available items, descriptions, prices, and declared allergens. Customers can search and browse without signing in. During the pilot, the page is read-only: customers ask the waiter to place or clarify an order. No QR payment is included. A public table label alone is not authorization to create a draft or mutate a table session; order requests require a designed, time-bounded table-session capability before they are enabled.

### Owner: Service dashboard

Capture a baseline before the pilot. Show service-time median and p90 with sample size, not only averages:

- Order submitted to kitchen-ready.
- Kitchen-ready to served.
- Later extension: table opened to first order and check requested to payment closed, once those event timestamps are recorded.
- Order corrections/duplicates, unavailable-item incidents, optional-menu use, and synchronization failures.

Break down by location, shift, and station only when the data volume supports a fair comparison. Missing or incomplete history is displayed as “Sin datos”, never estimated.

## Pilot Sequence

1. Improve and rehearse POS/KDS at the selected location.
2. Record a baseline for representative days and shifts.
3. Enable the optional read-only menu for limited tables.
4. Review exceptions daily and compare service and customer signals weekly.
5. Expand only after reliability, customer experience, and service-time guardrails pass.

Numeric targets, observation duration, minimum sample size, and pilot owner are business decisions to make after baseline measurement.

## Risks and Guardrails

- Do not enable customer order submission until staff identity, table-session authorization, tenant/location scoping, idempotency, and waiter confirmation are enforced server-side.
- Do not treat empty allergen data as evidence that a dish has no allergens; direct customers to staff for confirmation.
- Do not show customer names or contact details on the public menu page.
- If offline, never claim a request reached the kitchen until the server confirms it.
- Protect existing API routes before customer-facing production use. See [the security architecture hardening plan](../plans/2026-09-30-security-architecture-hardening-plan.md).

## Acceptance Criteria

- KDS tickets in each status column are ordered oldest first; invalid/missing timestamps remain last without destabilizing order.
- New orders record their initial status timestamp; accepted status changes append timestamp events without repeated duplicate states.
- Analytics returns order-to-ready and ready-to-served median, p90, and sample count; incomplete, invalid, or negative durations are excluded.
- Dashboard presents an explicit no-data state until measured transitions exist.
- Customer menu filters available dishes by category/search, shows allergen information only when declared, and safely renders server-provided text.
- QR table labels accept only the expected short table-label format; malformed values are ignored.
- Customer menu does not create orders, mutate table state, or process payments.
- Verify the rendered menu and analytics surfaces at desktop and phone widths; horizontal overflow must be zero.

## Implementation Status

- [x] KDS oldest-first ordering with stable invalid-date handling.
- [x] Order status-history helper and measured service-time calculations.
- [x] Analytics API fields for median, p90, and sample size.
- [x] Responsive read-only customer-menu page and staff preview link.
- [ ] Browser visual/accessibility checks and complete regression suite.
- [ ] Select pilot site, observation period, owner, and numeric rollout thresholds.