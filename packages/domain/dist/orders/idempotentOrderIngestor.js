import { OrderStateMachine } from './orderStateMachine.js';
import { AuditLedger } from '../auditLedger.js';
export class IdempotentOrderIngestor {
    static clientOrderMap = new Map();
    static ingest(params) {
        // 1. Verificación de Idempotencia por clientOrderId
        const existing = this.clientOrderMap.get(params.clientOrderId);
        if (existing) {
            return {
                order: existing,
                isDuplicate: true
            };
        }
        // 2. Creación y transición a CONFIRMED
        const order = OrderStateMachine.createOrder({
            id: `ord-${params.clientOrderId.slice(0, 8)}`,
            organizationId: params.organizationId,
            locationId: params.locationId,
            tableNumber: params.tableNumber,
            items: params.items
        });
        OrderStateMachine.transition(order, 'CONFIRMED');
        // 3. Emisión inmutable al Audit Ledger
        AuditLedger.appendRecord({
            organizationId: params.organizationId,
            locationId: params.locationId,
            actorId: params.actorId,
            action: 'ORDER_INGESTED',
            entityType: 'Order',
            entityId: order.id,
            payload: {
                clientOrderId: params.clientOrderId,
                tableNumber: params.tableNumber,
                itemCount: params.items.length,
                totalCents: order.totalCents.toString()
            },
            requestId: `req-${params.clientOrderId}`
        });
        this.clientOrderMap.set(params.clientOrderId, order);
        return {
            order,
            isDuplicate: false
        };
    }
    static clearCache() {
        this.clientOrderMap.clear();
    }
}
//# sourceMappingURL=idempotentOrderIngestor.js.map