# CLAUDE.md — Directrices de Desarrollo y Arquitectura KOBE

Este archivo define las invariantes innegociables, el flujo de trabajo estricto y la disciplina de ingeniería para cualquier agente de Inteligencia Artificial que trabaje en el monorepo de **KOBE / RESTOia**.

---

## 🏛️ 1. Invariantes de Dominio Innegociables

1. **Dinero y Finanzas (Zero Floats)**:
   - Toda cifra monetaria se almacena, opera y valida como **`BigInt` en centavos** (`Money = bigint`).
   - Jamás utilizar números en coma flotante (`number` de JavaScript/Python) para saldos, totales o impuestos.
   - Conversión a unidades legibles ($) únicamente en la capa final de presentación visual.
   - Fórmula de partida doble: $\sum \text{Débitos} \equiv \sum \text{Créditos}$. Ningún asiento se registra desbalanceado.

2. **Aislamiento Multi-Tenancy (Dual-Level Tenancy & RLS)**:
   - Toda entidad y consulta pertenece a un binomio `organizationId` y `locationId`.
   - Localizaciones no pueden leer ni mutar comandas, stock ni arqueos de otra localización sin rol corporativo autorizado.

3. **Inmutabilidad y Auditoría Criptográfica (SHA-256 Hash Chain)**:
   - Todo evento sensible (`ORDER_VOIDED`, `ITEM_DISCOUNTED`, `CASH_MOVEMENT`, `PRINT_JOB_ENQUEUED`, `STOCK_ADJUSTED`) se asienta en el **Audit Ledger**.
   - Cada registro incluye el hash SHA-256 del bloque precedente (`previousHash + payload`), impidiendo el repudio o la manipulación histórica.

4. **Validación de Frontera Estricta (Zod + ts-reset)**:
   - Todo payload externo (Webhooks de Mercado Pago, mensajes del Print Agent, respuestas HTTP de proveedores) entra como `unknown` (vía `@total-typescript/ts-reset`) y **debe validarse con esquemas Zod** antes de ser consumido por el dominio.

5. **Inventario FEFO y BOM (Bill of Materials)**:
   - Los insumos se descuentan por recetas escalables al momento de enviar la comanda a cocina.
   - La deducción de stock respeta la caducidad primero: **First Expired, First Out (FEFO)**.

---

## ⚙️ 2. Flujo de Trabajo y Disciplina Test-First (TDD / SDD)

1. **Test-First Obligatorio**:
   - Antes de escribir cualquier lógica de negocio o modificar código existente, se escribe primero el test unitario o de integración en Vitest que demuestre el comportamiento esperado o capture el bug.
   - No se da por completada una tarea sin pruebas automatizadas ejecutadas y en verde (`npx vitest run`).

2. **Separación de Responsabilidades**:
   - `packages/domain`: Lógica de dominio pura sin dependencias de base de datos ni framework.
   - `packages/db`: Esquemas relacionales Drizzle, migraciones, aislamiento RLS y repositorio persistente.
   - `server/`: API REST Express y despacho de eventos.
   - `public/`: UI PWA bistró (HTML/CSS/JS nativo, sin dependencias pesadas que ralenticen la carga en salón).

3. **Arquitectura de Impresión Universal**:
   - Desacople total: Qué se imprime (ReceiptBuilder) $\neq$ Cómo se formatea (ESC/POS binario / HTML 80mm) $\neq$ Cómo se envía (Print Agent / TCP 9100 / Browser window.print).
   - El ticket térmico debe incluir:
     - ID corto de verificación de 8 caracteres derivado del SHA-256 (ej: `VERIF: 7F3A-91C2`).
     - QR de consulta digital (`https://kobe.rest/v/...`).
     - Marca obligatoria de reimpresión: `*** COPIA / REIMPRESIÓN (N° X) ***`.

---

## 🚀 3. Comandos Útiles de Verificación

```bash
# Correr toda la suite de pruebas del monorepo
npx vitest run

# Compilar paquetes TypeScript
npm run build -w @kobe/domain
npm run build -w @kobe/db

# Verificar tipos sin emitir bundle
npm run typecheck

# Iniciar el servidor local
node server/index.js
```

---

## 🤖 4. Agent Skills (Matt Pocock Suite)

### Issue Tracker

GitHub Issues en [ExeDevCentral/RESTOai](https://github.com/ExeDevCentral/RESTOai/issues). Ver `docs/agents/issue-tracker.md`.

### Triage Labels

Vocabulario canónico de 5 estados (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Ver `docs/agents/triage-labels.md`.

### Domain Docs

Estructura single-context basada en `GLOSSARY.md` y `docs/adr/`. Ver `docs/agents/domain.md`.
