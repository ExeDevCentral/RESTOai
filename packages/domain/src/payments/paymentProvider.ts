import { Money } from '../primitives.js';

export interface CreateIntentParams {
  orderId: string;
  amountCents: Money;
  description: string;
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  amountCents: Money;
  status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED';
  initPointUrl?: string;
  createdAt: string;
}

export interface PaymentProvider {
  createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent>;
  verifyWebhookSignature(data: { eventId: string; timestamp: string; signature: string }): boolean;
}
