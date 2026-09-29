# Plan de Implementación: KOBE Fase 3 — Pagos, Caja & Webhooks Idempotentes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo financiero operativo de KOBE (Fase 3): Sesiones de caja inmutables (`CashRegisterSession`) con arqueos y cálculo auditado de discrepancias (`CashDiscrepancy`), pagos divididos (*Split Payments* / `PaymentAllocation`), interfaz unificada `PaymentProvider` con adaptadores (`CashAdapter`, `MercadoPagoAdapter`) y procesamiento idempotente de webhooks (`event_id` único deduplicado).

**Architecture:** Módulo de dominio financiero (`packages/domain/src/payments`, `packages/domain/src/cash`) desacoplado de las órdenes y de los proveedores externos mediante el patrón Adapter.

**Tech Stack:** TypeScript, Zod, Vitest.

**Spec:** [`docs/specs/2026-09-29-kobe-architecture-spec.md`](file:///c:/Users/exeme/Desktop/RESTOia/docs/specs/2026-09-29-kobe-architecture-spec.md)

---

## Global Constraints

- **Invariante Monetario:** Todos los pagos, fondos de caja y discrepancias se expresan en centavos `bigint`.
- **Desacople Orden vs Pago:** La máquina de pagos tiene su propio ciclo: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- **Split Payments:** Una comanda de $100.000 puede recibir $40.000 en efectivo y $60.000 por Mercado Pago sin romper el modelo.
- **Idempotencia de Webhooks:** Ningún webhook externo se procesa más de una vez gracias a la deduplicación por clave única `(provider, event_id)`.
- **Cierre de Caja Inmutable:** El arqueo compara `expected_cash` vs `actual_cash`. Si difieren, se registra un `CashDiscrepancy` inalterable en auditoría.

---

## Review Focus

1. **Intento de cobro sin sesión de caja abierta:** Intentar registrar un pago en efectivo sin una `CashRegisterSession` en estado `OPEN` arroja excepción.
2. **Pago dividido (Split):** Dos pagos parciales que suman el total de la orden marcan la cuenta como saldada.
3. **Webhook duplicado:** Enviar un webhook de Mercado Pago repetido tres veces con el mismo `event_id` produce exactamente una acreditación y dos respuestas idempotentes ignoradas.
4. **Discrepancia en arqueo de caja:** Cerrar una caja con faltante o sobrante de efectivo registra la diferencia exacta sin permitir sobrescribir los valores.
5. **Reembolsos con autorización:** Un reembolso genera un contraasiento inmutable con motivo tipado y actor responsable.

---

## Tasks

### Task 1: Sesiones de Caja, Arqueos & Discrepancias (`CashRegisterSession`)

**Files:**
- Create: `packages/domain/src/cash/cashSession.ts`
- Test: `packages/domain/tests/cashSession.test.ts`

**Interfaces:**
- Consumes: `Money` de `primitives.ts`, `AuditLedger`
- Produces: `CashRegisterSession`, `CashMovement`, `CashDiscrepancy`

- [ ] **Step 1: Write failing test for cash opening, movement recording, and discrepancy calculation on close**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement CashRegisterSession with immutable settlements**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Modelo de Pagos, Split Payments & Allocations

**Files:**
- Create: `packages/domain/src/payments/paymentTypes.ts`
- Create: `packages/domain/src/payments/paymentService.ts`
- Test: `packages/domain/tests/paymentService.test.ts`

**Interfaces:**
- Consumes: `Money`, `Order`
- Produces: `Payment`, `PaymentAllocation`, `PaymentService`

- [ ] **Step 1: Write failing test for split payments (Cash + Digital) fulfilling an order**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement PaymentService and allocation validation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Adaptadores de Pago (`PaymentProvider`, `MercadoPagoAdapter`)

**Files:**
- Create: `packages/domain/src/payments/paymentProvider.ts`
- Create: `packages/domain/src/payments/mercadoPagoAdapter.ts`
- Test: `packages/domain/tests/mercadoPagoAdapter.test.ts`

**Interfaces:**
- Consumes: `Payment`
- Produces: `PaymentProvider`, `MercadoPagoAdapter`

- [ ] **Step 1: Write failing test for Mercado Pago intent creation and signature verification**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement MercadoPagoAdapter**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Ingestor de Webhooks Idempotente

**Files:**
- Create: `packages/domain/src/payments/webhookHandler.ts`
- Test: `packages/domain/tests/webhookHandler.test.ts`

**Interfaces:**
- Consumes: `PaymentService`, `AuditLedger`
- Produces: `WebhookHandler`

- [ ] **Step 1: Write failing test simulating triplicate webhook delivery**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement WebhookHandler with deduplication and state mutation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
