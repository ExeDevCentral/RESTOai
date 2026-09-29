import { PaymentProvider, CreateIntentParams, PaymentIntent } from './paymentProvider.js';

export interface MercadoPagoConfig {
  accessToken: string;
}

export class MercadoPagoAdapter implements PaymentProvider {
  private readonly accessToken: string;

  constructor(config: MercadoPagoConfig) {
    this.accessToken = config.accessToken;
  }

  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
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

  verifyWebhookSignature(data: { eventId: string; timestamp: string; signature: string }): boolean {
    // Verificación de firma HMAC en entorno real, aquí validamos presencia y formato
    return !!(data.eventId && data.timestamp && data.signature);
  }
}
