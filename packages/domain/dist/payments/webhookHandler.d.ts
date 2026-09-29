import { Money } from '../primitives.js';
export interface WebhookEventPayload {
    provider: 'MERCADO_PAGO' | 'CARD_TERMINAL';
    eventId: string;
    data: {
        orderId: string;
        organizationId: string;
        locationId: string;
        amountCents: Money;
        status: 'PAID' | 'FAILED';
    };
}
export interface WebhookResult {
    processed: boolean;
    isDuplicate: boolean;
    eventId: string;
}
export declare class WebhookHandler {
    private static readonly processedEventKeys;
    static handleEvent(event: WebhookEventPayload): Promise<WebhookResult>;
    static clear(): void;
}
//# sourceMappingURL=webhookHandler.d.ts.map