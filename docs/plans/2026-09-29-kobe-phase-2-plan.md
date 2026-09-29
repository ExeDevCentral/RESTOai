# Plan de Implementación: KOBE Fase 2 — Inventario, Lotes & Motor FEFO

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor transaccional de inventario gastronómico de KOBE (Fase 2): Gestión de proveedores e insumos, lotes con fecha de vencimiento (`StockLot`), recetas con conversor de unidades dimensionales, movimientos inmutables (`StockMovement`) y asignación estricta FEFO (*First Expired, First Out*) con reservas al confirmar y consumo al cocinar (`SKIP LOCKED`).

**Architecture:** Módulo de dominio desacoplado (`packages/domain/src/inventory`) con ledger inmutable de stock, donde el stock disponible es una función de movimientos, nunca una columna editable en caliente.

**Tech Stack:** TypeScript, Zod, Vitest.

**Spec:** [`docs/specs/2026-09-29-kobe-architecture-spec.md`](file:///c:/Users/exeme/Desktop/RESTOia/docs/specs/2026-09-29-kobe-architecture-spec.md)

---

## Global Constraints

- **Stock Ledger Inmutable:** Tipos de movimientos: `PURCHASE`, `RESERVATION`, `CONSUMPTION`, `TRANSFER`, `ADJUSTMENT`, `WASTE`, `RETURN`.
- **Cantidades sin float:** Gramos (`WeightGrams` integer), mililitros (`VolumeMl` integer) y unidades discretas.
- **Asignación FEFO:** Siempre se consumen los lotes más próximos a vencer (`expiryDate ASC`).
- **Reserva vs Consumo:**
  - `Order CONFIRMED` genera `StockMovement(type='RESERVATION')`.
  - `KitchenTicket PREPARING` genera `StockMovement(type='CONSUMPTION')`.
  - Cancelar antes de cocinar libera reserva; cancelar después genera `WASTE` con motivo tipado.

---

## Review Focus

1. **Orden de vencimiento FEFO:** Al haber dos lotes (uno que vence en 3 días y otro en 10 días), el motor debe reservar y consumir siempre del lote de 3 días primero.
2. **Stock negativo:** Si la cantidad requerida supera el stock disponible en todos los lotes, la transacción de reserva es rechazada con `InsufficientStockError`.
3. **Conversión dimensional de unidades:** Una receta que pide 380g de carne consume exactamente 380g de un lote recibido en kilos (ej: 20 kg = 20.000g).
4. **Liberación de reservas al cancelar:** Cancelar una orden confirmada devuelve el stock reservado al inventario libre sin registrar merma.
5. **Registro de merma (Waste):** Cancelar una orden que ya entró en preparación en cocina registra un movimiento inmutable de `WASTE` con actor y motivo.

---

## Tasks

### Task 1: Sistema de Unidades Dimensionales & Ingredientes

**Files:**
- Create: `packages/domain/src/inventory/units.ts`
- Create: `packages/domain/src/inventory/ingredient.ts`
- Test: `packages/domain/tests/units.test.ts`

**Interfaces:**
- Consumes: `WeightGrams`, `VolumeMl` de `primitives.ts`
- Produces: `UnitConverter`, `Ingredient`

- [ ] **Step 1: Write failing test for unit conversions (kg to g, liters to ml, portions)**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement unit conversion math without floats**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Lotes de Stock (`StockLot`) & Movimientos Inmutables (`StockMovement`)

**Files:**
- Create: `packages/domain/src/inventory/stockLot.ts`
- Create: `packages/domain/src/inventory/stockMovement.ts`
- Create: `packages/domain/src/inventory/inventoryLedger.ts`
- Test: `packages/domain/tests/inventoryLedger.test.ts`

**Interfaces:**
- Consumes: `Ingredient`, `Money`
- Produces: `StockLot`, `StockMovement`, `InventoryLedger`

- [ ] **Step 1: Write failing test for stock lot reception and calculation of available balance**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement InventoryLedger with immutable movements**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Recetas de Platos & Desglose de Insumos

**Files:**
- Create: `packages/domain/src/inventory/recipe.ts`
- Test: `packages/domain/tests/recipe.test.ts`

**Interfaces:**
- Consumes: `Ingredient`, `UnitConverter`, `MenuItem`
- Produces: `Recipe`, `RecipeIngredient`

- [ ] **Step 1: Write failing test for recipe requirement calculation**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement Recipe model and ingredient scaling**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Motor de Asignación FEFO con Reserva y Consumo Concurrente

**Files:**
- Create: `packages/domain/src/inventory/fefoAllocator.ts`
- Test: `packages/domain/tests/fefoAllocator.test.ts`

**Interfaces:**
- Consumes: `InventoryLedger`, `Recipe`, `Order`
- Produces: `FefoAllocator`

- [ ] **Step 1: Write failing test for FEFO selection by earliest expiry date**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement FefoAllocator (reserve at CONFIRMED, consume at PREPARING, release/waste on CANCELLED)**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
