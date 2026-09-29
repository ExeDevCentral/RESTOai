import { describe, it, expect } from 'vitest';
import { MercadoPagoAdapter } from '../src/payments/mercadoPagoAdapter.js';

describe('Mercado Pago Payment Adapter Invariants', () => {
  it('creates payment intents with integer amount in cents and metadata', async () => {
    const adapter = new MercadoPagoAdapter({ accessToken: 'TEST-ACCESS-TOKEN' });

    const intent = await adapter.createPaymentIntent({
      orderId: 'ord-kobe-77',
      amountCents: 2450000n, // $24.500,00
      description: 'Consumo Mesa 04'
    });

    expect(intent.id).toBeDefined();
    expect(intent.amountCents).toBe(2450000n);
    expect(intent.status).toBe('PENDING');
  });

  it('verifies simulated webhook signature correctly', () => {
    const adapter = new MercadoPagoAdapter({ accessToken: 'TEST' });
    const isValid = adapter.verifyWebhookSignature({
      eventId: 'evt-123',
      timestamp: '1727635200',
      signature: 'valid-test-sig'
    });
    expect(isValid).toBe(true);
  });
});
