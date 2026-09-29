import { PaymentService } from './paymentService.js';
import { AuditLedger } from '../auditLedger.js';
export class WebhookHandler {
    // Clave compuesta: provider:eventId
    static processedEventKeys = new Set();
    static async handleEvent(event) {
        const eventKey = `${event.provider}:${event.eventId}`;
        // 1. Verificación de Idempotencia
        if (this.processedEventKeys.has(eventKey)) {
            return {
                processed: false,
                isDuplicate: true,
                eventId: event.eventId
            };
        }
        // 2. Procesamiento del pago
        if (event.data.status === 'PAID') {
            PaymentService.recordPayment({
                orderId: event.data.orderId,
                organizationId: event.data.organizationId,
                locationId: event.data.locationId,
                amountCents: event.data.amountCents,
                method: event.provider,
                externalId: event.eventId,
                actorId: `webhook:${event.provider.toLowerCase()}`
            });
        }
        // 3. Emisión al Audit Ledger inmutable
        AuditLedger.appendRecord({
            organizationId: event.data.organizationId,
            locationId: event.data.locationId,
            actorId: `webhook:${event.provider.toLowerCase()}`,
            action: 'WEBHOOK_PAYMENT_PROCESSED',
            entityType: 'WebhookEvent',
            entityId: event.eventId,
            payload: {
                provider: event.provider,
                orderId: event.data.orderId,
                amountCents: event.data.amountCents.toString(),
                status: event.data.status
            },
            requestId: `wh-req-${event.eventId}`
        });
        this.processedEventKeys.add(eventKey);
        return {
            processed: true,
            isDuplicate: false,
            eventId: event.eventId
        };
    }
    static clear() {
        this.processedEventKeys.clear();
    }
}
//# sourceMappingURL=webhookHandler.js.map