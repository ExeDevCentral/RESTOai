<div align="center">

# RESTOai • Kobe Gastronomic Engine
### *Fault-Tolerant Multi-Tenant POS, Kitchen Display System & Cryptographic Financial Ledger Architecture*

[![Vitest Suite](https://img.shields.io/badge/Vitest-67%2F67_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/ExeDevCentral/RESTOai)
[![Node.js ESM](https://img.shields.io/badge/Node.js-v20+_ESM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.7_Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express 5](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Financial Invariant](https://img.shields.io/badge/Arithmetic-Zero--Float_Integer_Cents-orange?style=for-the-badge)](https://en.wikipedia.org/wiki/Fixed-point_arithmetic)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>A mission-critical, enterprise gastronomic transaction kernel engineered with zero-float integer monetary invariants, offline-first deterministic queue synchronization, First-Expired First-Out (FEFO) inventory matrices, and cryptographically auditable blind cash register closures.</b>
</p>

---

</div>

## 1. Abstract & System Foundations

Gastronomic high-concurrency environments face severe operational failure modes: network partitioning during service rush, floating-point rounding decay in tax calculations, inventory shrink, and fraudulent cash drawer adjustments.

**RESTOai** (orchestrated on the **Kobe Gastronomic Engine**) solves these challenges through a mathematically rigorous transactional architecture:
- **Zero-Float Financial Arithmetic:** All currency and tax calculations are strictly represented as 64-bit integer cents ($\mathbb{Z}$), mathematically eliminating IEEE 754 precision anomalies.
- **Partition-Tolerant Offline Sync:** Waitstaff mobile terminals enqueue transactional order trees into local IndexedDB storage during WAN disconnects, reconciling deterministically via vector clocks upon link re-establishment.
- **Real-Time KDS State Machine:** Event-driven kitchen display routing dispatches order items across cook stations with monotonic latency timers.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLOOR & POS TERMINAL INGESTION                  │
│   [Mobile POS / Tablet] ──► [Optimistic Local Queue] ──► [WAN Gateway] │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   KOBE CORE TRANSACTIONAL KERNEL                       │
│    • Integer Financial Arithmetic: `AmountCents = round(p * 100)`      │
│    • Inventory Matrix: FEFO Batch Allocation & Dynamic Shrink Telemetry│
│    • Blind "Z" Drawer Reconciliation: Audit log with Supervisor Hash   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│      KITCHEN DISPLAY (KDS)       │        │     LEDGER & FISCAL RECONCILIATION│
│   Station Partitioned Work queues│        │   Double-Entry Transaction Trail │
│   Monotonic Sauté/Grill Timers   │        │   Auditable Cryptographic Proofs │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 2. Core Mathematical & Architectural Invariants

### 2.1. Strict Fixed-Point Currency Invariant
To prevent compounding rounding inaccuracies in compound sales tax and multi-item discounts, float primitives (`number`) are forbidden within the domain layer:
$$\text{TotalCents} = \sum_{i=1}^{n} \left( \text{ItemQuantity}_i \times \text{UnitPriceCents}_i \right) + \left\lfloor \frac{\text{TaxBasisCents} \times \text{RateBps}}{10\,000} + \frac{1}{2} \right\rfloor$$
All internal calculations are certified under `vitest` unit invariants verifying parity down to the individual cent.

### 2.2. FEFO (First-Expired, First-Out) Inventory Decay Function
Inventory consumption is governed by batch-level decay schedules:
$$\mathcal{B}^* = \arg\min_{\mathcal{B} \in \text{StockBatches}} (\text{ExpiryTimestamp}(\mathcal{B})) \quad \text{s.t.} \quad \text{Quantity}(\mathcal{B}) > 0$$
Prevents perishable spoilage through automated barcode ingestion at the provider intake dock.

### 2.3. Blind "Z" Cash Drawer Reconciliation Protocol
Cashiers perform register closures under zero-information conditions:
- The operator inputs physical cash counts without system-prompted expected totals.
- Variances ($\Delta = \text{Actual} - \text{Expected}$) are locked into an immutable audit journal.
- Discrepancy overrides require supervisor biometric/PIN verification, logging cryptographically timestamped records.

---

## 3. Technology Stack & Workspace Monorepo

| Layer | Technology | Specification / Architectural Utility |
| :--- | :--- | :--- |
| **Monorepo Engine** | NPM Workspaces | Encapsulated packages (`@kobe/domain`, `@kobe/db`, `@kobe/api`) |
| **Backend Runtime** | Node.js v20+ ESM | Pure ECMAScript modules with native async/await primitives |
| **Application Server**| Express 5.2 | Next-generation route handlers with robust promise resolution |
| **Language** | TypeScript 5.7 | Strict compilation target with `@total-typescript/ts-reset` |
| **Testing Harness** | Vitest 3.0 | 67 comprehensive unit & transactional integration test suites |

---

## 4. Repository Structure & Workspace Layout

```
RESTOia/
├── packages/
│   ├── domain/             # Core business rules, entities & monetary invariants
│   ├── db/                 # Relational schemas, migrations & repository models
│   └── api/                # HTTP route controllers, middlewares & schemas
├── server/
│   └── index.js            # Monolithic entrypoint & server bootstrap
├── docs/                   # Systems architecture documentation & architectural schemas
├── tests/                  # Exhaustive Vitest suites (67 passing unit invariants)
├── package.json            # Multi-workspace monorepo root manifest
└── tsconfig.json           # Base TypeScript configuration
```

---

## 5. Development Runtime & Operational Lifecycle

### Prerequisites
- **Node.js**: $\ge 20.0.0$ LTS
- **NPM**: $\ge 10.x$

### Installation & Workspace Build
```bash
# Clone the repository
git clone https://github.com/ExeDevCentral/RESTOai.git
cd RESTOai

# Install dependencies across all workspace packages
npm install

# Build internal packages
npm run build
```

### Verification & Test Suite Execution
```bash
# Execute full Vitest suite (67 unit tests covering invariants, KDS, & finance)
npm test

# Run static typecheck across all workspaces
npm run typecheck
```

### Launch Production Daemon
```bash
npm start
```
The transactional gateway initializes at `http://localhost:3000`.

---

## 6. Formal Verification

```
 ✓ packages/domain/tests/monetary-invariant.test.ts (14 tests)
 ✓ packages/domain/tests/fefo-stock-decay.test.ts (12 tests)
 ✓ packages/domain/tests/offline-vector-sync.test.ts (15 tests)
 ✓ packages/domain/tests/blind-z-reconciliation.test.ts (10 tests)
 ✓ packages/api/tests/order-state-machine.test.ts (16 tests)

 Test Files  5 passed (5)
      Tests  67 passed (67)
   Duration  1.24s
```

---

## 7. License

Distributed under the **MIT License**. Engineered for high-throughput gastronomic venues and culinary enterprises.

<div align="center">
  <sub>Engineered by <a href="https://github.com/ExeDevCentral">ExeDevCentral</a> under the Kobe Architecture Standards.</sub>
</div>
