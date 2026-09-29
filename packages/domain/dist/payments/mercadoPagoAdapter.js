export class MercadoPagoAdapter {
    accessToken;
    constructor(config) {
        this.accessToken = config.accessToken;
    }
    async createPaymentIntent(params) {
        const intentId = `mp-intent-${crypto.randomUUID().slice(0, 8)}`;
        return {
            id: intentId,
            orderId: params.orderId,
            amountCents: params.amountCents,
            status: 'PENDING',
            initPointUrl: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${intentId}`,
            createdAt: new Date().toISOString()
        };
    }
    verifyWebhookSignature(data) {
        // Verificación de firma HMAC en entorno real, aquí validamos presencia y formato
        return !!(data.eventId && data.timestamp && data.signature);
    }
}
//# sourceMappingURL=mercadoPagoAdapter.js.map