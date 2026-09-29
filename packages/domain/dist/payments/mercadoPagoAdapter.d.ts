import { PaymentProvider, CreateIntentParams, PaymentIntent } from './paymentProvider.js';
export interface MercadoPagoConfig {
    accessToken: string;
}
export declare class MercadoPagoAdapter implements PaymentProvider {
    private readonly accessToken;
    constructor(config: MercadoPagoConfig);
    createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent>;
    verifyWebhookSignature(data: {
        eventId: string;
        timestamp: string;
        signature: string;
    }): boolean;
}
//# sourceMappingURL=mercadoPagoAdapter.d.ts.map