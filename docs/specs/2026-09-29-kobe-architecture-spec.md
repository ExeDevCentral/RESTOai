# Architecture Decision Record & Especificación Fundacional: KOBE Gastronomic Engine

**Estado:** Aprobado para Fase 0  
**Fecha:** 2026-09-29  
**Proyecto:** KOBE Gastronomic Engine  

---

## 1. Contexto y Misión
KOBE no es simplemente una app de restaurante ni un CRUD POS tradicional. Es un **motor transaccional gastronómico multi-tenant** con:
1. **Contabilidad Operacional y Fiscal**: Partida doble matemática (DEBE = HABER), soporte fiscal argentino (ARCA/ex-AFIP) y cash registers inmutables.
2. **Trazabilidad de Inventario FEFO**: Stock como ledger inmutable de movimientos auditados, control de concurrencia a nivel lote (`SKIP LOCKED`) y conversor dimensional de unidades.
3. **Máquinas de Estado Ortogonales**: Desacople estricto entre el ciclo de vida de la Orden (`Order`), los despachos de Cocina (`KitchenTicket`) y las transacciones de Pago (`Payment`).
4. **Agente IA con Tool Registry Seguro**: La IA opera exclusivamente mediante servicios de dominio tipados (Zod contracts), con separación estricta Read vs Write, confirmación humana y log criptográfico en auditoría. Jamás ejecuta DDL ni SQL libre.
5. **Cadena de Auditoría Inmutable**: Hash chain (`sha256(prev_hash || payload)`), triggers y revocación de UPDATE/DELETE a nivel PostgreSQL.

---

## 2. Decisiones Arquitectónicas Clave (ADRs)

### ADR-01: Separación de Ledgers (Operational vs Accounting vs Audit)
- **Operational Stock Ledger**: Movimientos inmutables (`PURCHASE`, `CONSUMPTION`, `TRANSFER`, `ADJUSTMENT`, `WASTE`, `RETURN`). El stock disponible es una función/vista sobre movimientos, nunca un número editable en caliente.
- **Accounting Ledger**: Partida doble pura (`JournalEntry` + `JournalLine`). Invariante estricto: $\sum \text{Debit} = \sum \text{Credit}$.
- **Audit Ledger**: Registro append-only con hash encadenado (`prev_hash`), actor, tenant, acción, diff before/after y request correlation ID.

### ADR-02: Tenancy Jerárquico de Dos Niveles
- `Organization` (Razón social / Grupo gastronómico).
- `Location` (Sucursal física: mesas, stock, cajas, comandas).
- `tenant_id` y `location_id` se derivan forzosamente del token autenticado/RLS, nunca de datos enviados arbitrariamente por el cliente.

### ADR-03: Máquinas de Estado Desacopladas
- **Order Lifecycle**: `DRAFT` $\to$ `CONFIRMED` $\to$ `IN_PREPARATION` $\to$ `READY` $\to$ `DELIVERED` $\to$ `CANCELLED` $\to$ `CLOSED`.
- **Kitchen Ticket**: `QUEUED` $\to$ `PREPARING` $\to$ `READY` $\to$ `CANCELLED`.
- **Payment Intent**: `PENDING` $\to$ `AUTHORIZED` $\to$ `PAID` $\to$ `FAILED` $\to$ `REFUNDED` $\to$ `PARTIALLY_REFUNDED`.

### ADR-04: Concurrencia de Inventario FEFO
- Reserva de ingredientes al momento `CONFIRMED`.
- Consumo real de lote al momento `PREPARING`.
- Selección de lotes: `SELECT ... FOR UPDATE SKIP LOCKED` ordenado por `expiry_date ASC`.
- Cancelación antes de cocinar libera reserva; cancelación posterior genera `StockMovement(type='WASTE' | 'RETURN')`.

### ADR-05: Integridad Financiera y Tipado de Monedas
- Todos los importes monetarios se persisten en `bigint` (centavos/milis). Gramos/mililitros en `integer` o `numeric(14,3)`. Prohibido el uso de `float`/`double`.
