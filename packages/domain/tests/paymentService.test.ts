import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../src/payments/paymentService.js';
import { CashSessionManager } from '../src/cash/cashSession.js';

describe('Payment & Split Allocations Invariants', () => {
  const orgId = 'org-kobe-1';
  const locId = 'loc-centro';
  const orderId = 'ord-split-100k';

  beforeEach(() => {
    PaymentService.clear();
    CashSessionManager.clear();

    // Abrir sesión de caja para aceptar efectivo
    CashSessionManager.openSession({
      organizationId: orgId,
      locationId: locId,
      cashierId: 'cajero-1',
      initialFloatCents: 1000000n
    });
  });

  it('fulfills an order using Split Payments ($40.000 cash + $60.000 digital)', () => {
    const totalOrderCents = 10000000n; // $100.000,00

    // 1. Primer pago: $40.000 en Efectivo
    const cashPayment = PaymentService.recordPayment({
      orderId,
      organizationId: orgId,
      locationId: locId,
      amountCents: 4000000n,
      method: 'CASH',
      actorId: 'usr-cajero-1'
    });

    expect(cashPayment.status).toBe('PAID');
    expect(PaymentService.getOrderPaidAmount(orderId)).toBe(4000000n);
    expect(PaymentService.isOrderFullyPaid(orderId, totalOrderCents)).toBe(false);

    // 2. Segundo pago: $60.000 por Mercado Pago
    const mpPayment = PaymentService.recordPayment({
      orderId,
      organizationId: orgId,
      locationId: locId,
      amountCents: 6000000n,
      method: 'MERCADO_PAGO',
      externalId: 'mp-payment-789',
      actorId: 'system'
    });

    expect(mpPayment.status).toBe('PAID');
    expect(PaymentService.getOrderPaidAmount(orderId)).toBe(10000000n);
    expect(PaymentService.isOrderFullyPaid(orderId, totalOrderCents)).toBe(true);
  });

  it('rejects cash payments if no active cash session is open at the location', () => {
    CashSessionManager.clear(); // Sin sesiones abiertas

    expect(() => {
      PaymentService.recordPayment({
        orderId: 'ord-fail',
        organizationId: orgId,
        locationId: locId,
        amountCents: 2000000n,
        method: 'CASH',
        actorId: 'usr-cajero-1'
      });
    }).toThrow('NoActiveCashSessionError');
  });
});
