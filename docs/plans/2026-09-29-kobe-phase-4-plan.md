# Plan de Implementación: KOBE Fase 4 — Contabilidad Operacional & Módulo Fiscal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor de contabilidad operacional por partida doble de KOBE (Fase 4): Plan de cuentas gastronómico (`Account`), asientos contables (`JournalEntry`) con líneas (`JournalLine`) que imponen la invariante matemática estricta $\sum \text{DEBE} = \sum \text{HABER}$, generación automática de asientos por eventos del dominio (ventas, compras, mermas, cobros) y módulo fiscal argentino para emisión de comprobantes (Factura A/B/C, Libro IVA Ventas y contingencia).

**Architecture:** Módulo de dominio contable (`packages/domain/src/accounting`, `packages/domain/src/fiscal`) desacoplado de las operaciones directas, alimentado por eventos inmutables del sistema.

**Tech Stack:** TypeScript, Zod, Vitest.

**Spec:** [`docs/specs/2026-09-29-kobe-architecture-spec.md`](file:///c:/Users/exeme/Desktop/RESTOia/docs/specs/2026-09-29-kobe-architecture-spec.md)

---

## Global Constraints

- **Invariante Matemática Inquebrantable:** $\sum \text{Debit} = \sum \text{Credit}$ exactamente al centavo (`bigint`). Prohibido cualquier asiento desbalanceado.
- **Asientos Inmutables:** Los asientos registrados nunca se modifican ni eliminan; las correcciones se realizan exclusivamente mediante contraasientos o asientos de reversión.
- **Libro IVA Ventas:** Alícuotas estándar de Argentina (21% general, 10.5% diferenciales) calculadas con redondeo exacto al entero de centavos.

---

## Review Focus

1. **Rechazo de asiento desbalanceado:** Un intento de registrar un asiento donde $\sum \text{DEBE} \neq \sum \text{HABER}$ falla con `UnbalancedJournalEntryError`.
2. **Generación automática por venta:** Una venta de $121.000 con 21% de IVA genera automáticamente: DEBE Caja/Banco $121.000, HABER Ventas $100.000, HABER IVA Débito Fiscal $21.000.
3. **Asiento por merma (Waste):** Una merma registrada en inventario genera: DEBE Pérdida por Desperdicio, HABER Mercaderías en Stock.
4. **Comprobante fiscal con CAE:** Emisión y cálculo de importes para Factura B / Ticket Fiscal con discriminación de IVA.
5. **Aislamiento por Organización:** Un asiento contable pertenece estrictamente a una organización y sucursal.

---

## Tasks

### Task 1: Plan de Cuentas Gastronómico (`ChartOfAccounts`)

**Files:**
- Create: `packages/domain/src/accounting/accountTypes.ts`
- Create: `packages/domain/src/accounting/chartOfAccounts.ts`
- Test: `packages/domain/tests/chartOfAccounts.test.ts`

**Interfaces:**
- Consumes: None
- Produces: `Account`, `AccountType`, `ChartOfAccounts`

- [ ] **Step 1: Write failing test for standard chart of accounts hierarchy**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement ChartOfAccounts and standard gastronomy codes (Caja, Banco, Ventas, Costo Mercadería, IVA)**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Partida Doble Matemática (`JournalEntry` & `JournalLine`)

**Files:**
- Create: `packages/domain/src/accounting/journalEntry.ts`
- Create: `packages/domain/src/accounting/accountingLedger.ts`
- Test: `packages/domain/tests/accountingLedger.test.ts`

**Interfaces:**
- Consumes: `Money`, `ChartOfAccounts`
- Produces: `JournalEntry`, `JournalLine`, `AccountingLedger`

- [ ] **Step 1: Write failing test enforcing SUM(Debit) = SUM(Credit)**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement AccountingLedger and balance validator**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Generador de Asientos Automáticos por Eventos de Dominio

**Files:**
- Create: `packages/domain/src/accounting/journalAutomator.ts`
- Test: `packages/domain/tests/journalAutomator.test.ts`

**Interfaces:**
- Consumes: `Order`, `Payment`, `StockMovement`, `AccountingLedger`
- Produces: `JournalAutomator`

- [ ] **Step 1: Write failing test for sale, payment, and waste automatic journal entries**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement JournalAutomator**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Módulo Fiscal Argentino (Facturación ARCA & Libro IVA Ventas)

**Files:**
- Create: `packages/domain/src/fiscal/fiscalTypes.ts`
- Create: `packages/domain/src/fiscal/fiscalEngine.ts`
- Test: `packages/domain/tests/fiscalEngine.test.ts`

**Interfaces:**
- Consumes: `Money`, `Order`, `AuditLedger`
- Produces: `FiscalInvoice`, `FiscalEngine`

- [ ] **Step 1: Write failing test for electronic invoice generation (CAE) and VAT breakdown**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement FiscalEngine with standard Argentine tax rules**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
