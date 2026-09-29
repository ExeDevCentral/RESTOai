# Plan de Implementación: KOBE Fase 1 — Órdenes, Catálogo & Cocina KDS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el núcleo transaccional operativo de KOBE (Fase 1): Catálogo gastronómico versionado, Máquinas de Estado desacopladas (`OrderStateMachine` y `KitchenTicketStateMachine`), cola de despacho KDS en tiempo real y soporte para captura de comandas offline con UUID idempotente.

**Architecture:** Módulo de dominio desacoplado (`packages/domain/src/orders`, `packages/domain/src/kitchen`, `packages/domain/src/catalog`) con máquinas de estado que imponen transiciones válidas e invariantes antes de persistencia y emisión de eventos.

**Tech Stack:** TypeScript, Zod, Vitest.

**Spec:** [`docs/specs/2026-09-29-kobe-architecture-spec.md`](file:///c:/Users/exeme/Desktop/RESTOia/docs/specs/2026-09-29-kobe-architecture-spec.md)

---

## Global Constraints

- **Máquinas de Estado Ortogonales:** La máquina de `Order` no transiciona por pagos. Sus estados son: `DRAFT`, `CONFIRMED`, `IN_PREPARATION`, `READY`, `DELIVERED`, `CANCELLED`, `CLOSED`.
- **Kitchen Tickets Independientes:** Estados: `QUEUED`, `PREPARING`, `READY`, `CANCELLED`.
- **Precios en Centavos:** Moneda siempre en `bigint` (Money primitive).
- **Idempotencia:** Cada orden generada por el mozo/cliente incluye un `clientOrderId` (UUID v4) para sobrevivir a reconexiones offline sin duplicados.

---

## Review Focus

1. **Transición inválida de Orden:** Intento de pasar una orden directamente de `DRAFT` a `READY` o `DELIVERED` falla con `InvalidOrderTransitionError`.
2. **Cancelación tardía:** Cancelar una orden que ya está en `DELIVERED` o `CLOSED` es rechazada.
3. **Idempotencia de comanda:** Enviar dos veces el mismo `clientOrderId` retorna la orden existente sin crear una segunda comanda.
4. **Despacho de Cocina:** Un `KitchenTicket` marcado como `READY` actualiza la orden correspondiente a `READY` solo si todos sus tickets asociados están listos.
5. **Aislamiento por Local:** Un ticket de cocina de `Location 1` no puede ser procesado por una estación de `Location 2`.

---

## Tasks

### Task 1: Catálogo Gastronómico & Precios Versionados

**Files:**
- Create: `packages/domain/src/catalog/menuItem.ts`
- Create: `packages/domain/src/catalog/catalogService.ts`
- Test: `packages/domain/tests/catalog.test.ts`

**Interfaces:**
- Consumes: `Money` de `@kobe/domain/primitives`
- Produces: `MenuItem`, `CatalogCategory`, `CatalogService`

- [ ] **Step 1: Write failing test for MenuItem and price validation**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement catalog schema and service**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Order State Machine & Desacople Transaccional

**Files:**
- Create: `packages/domain/src/orders/orderStateMachine.ts`
- Create: `packages/domain/src/orders/orderTypes.ts`
- Test: `packages/domain/tests/orderStateMachine.test.ts`

**Interfaces:**
- Consumes: `MenuItem`, `Money`
- Produces: `Order`, `OrderState`, `OrderStateMachine`

- [ ] **Step 1: Write failing test for state transitions and invalid state checks**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement OrderStateMachine with explicit valid transition graph**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Kitchen Display System (KDS) & KitchenTicket State Machine

**Files:**
- Create: `packages/domain/src/kitchen/kitchenTicket.ts`
- Create: `packages/domain/src/kitchen/kitchenDispatcher.ts`
- Test: `packages/domain/tests/kitchenDispatcher.test.ts`

**Interfaces:**
- Consumes: `Order`, `OrderStateMachine`
- Produces: `KitchenTicket`, `KitchenStation`, `KitchenDispatcher`

- [ ] **Step 1: Write failing test for order split into station tickets (Parrilla, Pastas, Fríos)**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement KitchenTicketStateMachine & Dispatcher**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Offline Queue & Idempotent Order Ingestion

**Files:**
- Create: `packages/domain/src/orders/idempotentOrderIngestor.ts`
- Test: `packages/domain/tests/idempotentOrderIngestor.test.ts`

**Interfaces:**
- Consumes: `OrderStateMachine`, `AuditLedger`
- Produces: `IdempotentOrderIngestor`

- [ ] **Step 1: Write failing test simulating network retry with duplicate clientOrderId**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement ingestor with deduplication cache and audit emission**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
