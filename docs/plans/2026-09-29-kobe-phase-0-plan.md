# KOBE Gastronomic Engine — Fase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las fundaciones completas de KOBE (Fase 0): Monorepo, esquema PostgreSQL con tenancy jerárquico (`Organization` -> `Location`), Row Level Security (RLS) estricto por tenant/location, matriz de roles y permisos granulares, y ledger de auditoría inmutable append-only con hash chain criptográfico (`sha256(prev_hash || payload)`) probado con tests de invariantes.

**Architecture:** Monolito modular en TypeScript con PostgreSQL como fuente única de verdad. Contextos delimitados (`modules/auth-tenancy`, `modules/audit`, etc.) con Drizzle ORM / SQL de migraciones puras para control total de triggers y políticas RLS.

**Tech Stack:** TypeScript, Node.js, PostgreSQL / Supabase, Drizzle ORM, Zod, Vitest.

**Spec:** [`docs/specs/2026-09-29-kobe-architecture-spec.md`](file:///c:/Users/exeme/Desktop/RESTOia/docs/specs/2026-09-29-kobe-architecture-spec.md)

---

## Global Constraints

- **No Float para Dinero:** Todos los montos se representan como enteros `bigint` (centavos).
- **Inmutabilidad de Auditoría:** Tabla `audit_ledger` con `REVOKE UPDATE, DELETE ON audit_ledger FROM PUBLIC, authenticated, anon`.
- **Hash Chain:** Cada fila de auditoría computa `hash = sha256(coalesce(prev_hash, '') || payload || timestamp)`.
- **Tenancy Aislado:** Ningún cliente puede inyectar `organization_id` o `location_id`. Ambos se extraen del contexto de sesión/JWT validado por RLS (`current_tenant_id()`, `current_location_id()`).

---

## Review Focus

1. **Intento de cruce de tenants:** Un usuario autenticado con tenant A intenta ejecutar `SELECT`, `UPDATE` o `DELETE` sobre registros de tenant B y la base de datos retorna 0 filas o rechaza por RLS.
2. **Manipulación de auditoría:** Intento de modificar o borrar una fila en `audit_ledger` falla con error de permisos en PostgreSQL incluso para el rol de aplicación.
3. **Rotura de hash chain:** Si se inserta manualmente un registro con un `prev_hash` inválido, el trigger de verificación de integridad rechaza la transacción.
4. **Permisos jerárquicos:** Un usuario con rol `Waiter` en `Location 1` no puede leer o escribir en `Location 2`, mientras un `Owner` de la `Organization` tiene visibilidad sobre todas sus sucursales.
5. **Idempotencia de funciones RLS:** `current_tenant_id()` y `current_location_id()` operan de forma consistente en transacciones anidadas y conexiones concurrentes.

---

## Tasks

### Task 1: Monorepo Setup & Workspace Scaffolding

**Files:**
- Create: `package.json` (root workspace config)
- Create: `pnpm-workspace.yaml` / npm workspaces config
- Create: `packages/db/package.json`
- Create: `packages/domain/package.json`
- Create: `tsconfig.base.json`

**Interfaces:**
- Consumes: None
- Produces: Monorepo con workspaces `packages/db` y `packages/domain`.

- [ ] **Step 1: Write workspace configuration files**
  Configurar workspaces para gestionar paquetes modulares desacoplados.

- [ ] **Step 2: Setup TypeScript base config and dependencies**
  Instalar `drizzle-orm`, `zod`, `vitest`, `pg` y herramientas de tipado estricto.

- [ ] **Step 3: Verify workspace build and test runner**
  Run: `npm run test`
  Expected: vitest ejecuta y detecta suite vacía sin errores.

- [ ] **Step 4: Commit**
  ```bash
  git add .
  git commit -m "chore: setup monorepo workspaces for kobe engine"
  ```

---

### Task 2: Core Tenancy Schema (Organization & Location) & RLS Engine

**Files:**
- Create: `packages/db/src/schema/tenancy.sql`
- Create: `packages/db/src/schema/functions.sql`
- Create: `packages/db/src/schema/tenancy.ts`
- Test: `packages/db/tests/tenancy-rls.test.ts`

**Interfaces:**
- Consumes: PostgreSQL connection pool
- Produces:
  - Tablas: `organizations`, `locations`, `users`, `organization_memberships`, `location_memberships`.
  - Funciones SQL: `current_tenant_id()`, `current_location_id()`, `set_app_context(tenant_id, location_id, user_id)`.
  - Políticas RLS: Aislamiento por `organization_id` y filtro opcional por `location_id`.

- [ ] **Step 1: Write SQL migration for Organizations, Locations and Memberships**
  Definir esquemas con UUIDs v4/v7, timestamps con timezone y foreign keys con eliminación controlada (`RESTRICT`).

- [ ] **Step 2: Implement Context Functions & RLS Policies**
  Crear funciones `current_tenant_id()` leyendo `current_setting('app.current_tenant_id', true)` y habilitar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

- [ ] **Step 3: Write test for tenant isolation (Cross-tenant breach test)**
  Crear Tenant A y Tenant B. Establecer contexto en Tenant A y asegurar que `SELECT * FROM locations` no devuelve filas de Tenant B.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --workspace=@kobe/db test tests/tenancy-rls.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/db
  git commit -m "feat(db): implement organization/location tenancy schema with strict RLS"
  ```

---

### Task 3: RBAC Matrix (Roles & Granular Permissions)

**Files:**
- Create: `packages/db/src/schema/rbac.sql`
- Create: `packages/domain/src/auth/permissions.ts`
- Test: `packages/db/tests/rbac-permissions.test.ts`

**Interfaces:**
- Consumes: `users`, `organizations`, `locations`
- Produces:
  - Tablas: `roles`, `permissions`, `role_permissions`, `user_roles`.
  - Helpers: `has_permission(user_id, location_id, permission_code)`.

- [ ] **Step 1: Define permissions domain matrix**
  Códigos estándar: `orders:create`, `orders:cancel`, `kds:view`, `kds:dispatch`, `inventory:read`, `inventory:adjust`, `cash:open`, `cash:close`, `cash:discrepancy`, `audit:read`.

- [ ] **Step 2: Write SQL schema for roles & permissions**
  Asignaciones polimórficas a nivel Organization y Location.

- [ ] **Step 3: Write failing test verifying role inheritance and boundary enforcement**
  Probar que `Waiter` en Local 1 tiene `orders:create` en Local 1 pero no en Local 2, y no tiene `cash:close`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --workspace=@kobe/db test tests/rbac-permissions.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/db packages/domain
  git commit -m "feat(auth): implement granular rbac matrix for multi-location gastronomy"
  ```

---

### Task 4: Tamper-Proof Audit Ledger with Cryptographic Hash Chain

**Files:**
- Create: `packages/db/src/schema/audit_ledger.sql`
- Create: `packages/db/src/triggers/audit_hash_chain.sql`
- Test: `packages/db/tests/audit-tamper-proof.test.ts`

**Interfaces:**
- Consumes: `current_tenant_id()`, `current_location_id()`
- Produces:
  - Tabla: `audit_ledger (id, tenant_id, location_id, actor_id, action, entity_type, entity_id, before_state, after_state, prev_hash, hash, request_id, created_at)`.
  - Trigger: `fn_audit_append_hash()` que autocalcula `hash = sha256(coalesce(prev_hash, '') || payload)` y bloquea mutaciones.

- [ ] **Step 1: Write schema and trigger for hash-chain calculation**
  Implementar cálculo de SHA-256 en PL/pgSQL tomando el `hash` del último registro del tenant para encadenar la secuencia.

- [ ] **Step 2: Revoke UPDATE and DELETE permissions on audit table**
  Asegurar a nivel DDL que ningún usuario de aplicación pueda modificar filas preexistentes.

- [ ] **Step 3: Write test attempting to modify/delete audit rows and verifying hash chain integrity**
  Verificar que:
  1. `UPDATE audit_ledger SET action = 'tampered'` arroja excepción en Postgres.
  2. `DELETE FROM audit_ledger` arroja excepción.
  3. La secuencia de hashes forma una cadena criptográfica verificable.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --workspace=@kobe/db test tests/audit-tamper-proof.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/db
  git commit -m "feat(audit): implement tamper-proof append-only audit ledger with sha256 hash chain"
  ```

---

### Task 5: End-to-End Foundation Integration Test & Verification

**Files:**
- Test: `packages/db/tests/foundation-e2e.test.ts`

**Interfaces:**
- Consumes: All Phase 0 components (Tenancy, RLS, RBAC, Audit)
- Produces: Verificación holística del Criterio de Salida de Fase 0.

- [ ] **Step 1: Write holistic integration test**
  Simular escenario completo:
  - Creación de Organización "Grupo Gastronómico KOBE".
  - Creación de Locales "Kobe Rosario" y "Kobe Funes".
  - Creación de usuarios Mozo, Cajero y Dueño.
  - Ejecutar operaciones concurrentes y verificar que todas generan eventos de auditoría con hash chain íntegro y aislamiento 100% estricto de RLS.

- [ ] **Step 2: Run all test suites**
  Run: `npm test`
  Expected: Todos los tests de la suite pasan limpiamente.

- [ ] **Step 3: Commit and Phase 0 delivery tag**
  ```bash
  git add .
  git commit -m "chore: complete phase 0 foundations for kobe gastronomic engine"
  ```
