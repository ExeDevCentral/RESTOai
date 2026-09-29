import { describe, it, expect, beforeEach } from 'vitest';
import { WebhookHandler } from '../src/payments/webhookHandler.js';
import { PaymentService } from '../src/payments/paymentService.js';
import { AuditLedger } from '../src/auditLedger.js';

describe('Webhook Deduplication & Idempotent Processing Invariants', () => {
  beforeEach(() => {
    WebhookHandler.clear();
    PaymentService.clear();
    AuditLedger.clearLedger();
  });

  it('processes payment webhook successfully on first attempt and updates payment status', async () => {
    const payload = {
      provider: 'MERCADO_PAGO',
      eventId: 'evt-mp-99901',
      data: {
        orderId: 'ord-kobe-50',
        organizationId: 'org-kobe-1',
        locationId: 'loc-centro',
        amountCents: 3500000n, // $35.000
        status: 'PAID'
      }
    };

    const result = await WebhookHandler.handleEvent(payload);
    expect(result.processed).toBe(true);
    expect(result.isDuplicate).toBe(false);

    // Se registró el pago
    expect(PaymentService.getOrderPaidAmount('ord-kobe-50')).toBe(3500000n);

    // Auditoría emitida
    const audit = AuditLedger.getLedger('org-kobe-1');
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('WEBHOOK_PAYMENT_PROCESSED');
  });

  it('strictly deduplicates duplicate webhooks (Mercado Pago retrying 3 times)', async () => {
    const payload = {
      provider: 'MERCADO_PAGO',
      eventId: 'evt-mp-99902',
      data: {
        orderId: 'ord-kobe-51',
        organizationId: 'org-kobe-1',
        locationId: 'loc-centro',
        amountCents: 5000000n,
        status: 'PAID'
      }
    };

    // Intento 1
    const res1 = await WebhookHandler.handleEvent(payload);
    expect(res1.processed).toBe(true);
    expect(res1.isDuplicate).toBe(false);

    // Intento 2 (Reintento de MP)
    const res2 = await WebhookHandler.handleEvent(payload);
    expect(res2.processed).toBe(false);
    expect(res2.isDuplicate).toBe(true);

    // Intento 3 (Reintento de MP)
    const res3 = await WebhookHandler.handleEvent(payload);
    expect(res3.processed).toBe(false);
    expect(res3.isDuplicate).toBe(true);

    // Solo se debe haber acreditado UNA vez $50.000 (no $150.000)
    expect(PaymentService.getOrderPaidAmount('ord-kobe-51')).toBe(5000000n);
    expect(AuditLedger.getLedger('org-kobe-1')).toHaveLength(1);
  });
});
