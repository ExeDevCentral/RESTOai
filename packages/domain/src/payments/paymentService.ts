import { Payment, PaymentAllocation } from './paymentTypes.js';
import { CashSessionManager } from '../cash/cashSession.js';
import { Money } from '../primitives.js';

export interface RecordPaymentParams {
  orderId: string;
  organizationId: string;
  locationId: string;
  amountCents: Money;
  method: Payment['method'];
  externalId?: string;
  actorId: string;
}

export class PaymentService {
  private static readonly payments = new Map<string, Payment>();
  private static readonly allocations: PaymentAllocation[] = [];

  static recordPayment(params: RecordPaymentParams): Payment {
    // Si el pago es en efectivo, requerimos estrictamente sesión de caja abierta
    if (params.method === 'CASH') {
      const activeSession = CashSessionManager.getActiveSession(params.locationId);
      if (!activeSession) {
        throw new Error('NoActiveCashSessionError: Cash payment rejected because no cash session is open');
      }
      // Actualizar ingreso en la caja
      CashSessionManager.recordCashInflow(activeSession.id, params.amountCents, 'SALE', params.orderId);
    }

    const paymentId = `pay-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const payment: Payment = {
      id: paymentId,
      ...params,
      status: 'PAID',
      createdAt: now
    };

    this.payments.set(paymentId, payment);

    // Registrar allocation
    this.allocations.push({
      id: `alloc-${crypto.randomUUID().slice(0, 8)}`,
      orderId: params.orderId,
      paymentId,
      allocatedAmountCents: params.amountCents,
      allocatedAt: now
    });

    return payment;
  }

  static getOrderPaidAmount(orderId: string): Money {
    return this.allocations
      .filter(a => a.orderId === orderId)
      .reduce((sum, a) => sum + a.allocatedAmountCents, 0n);
  }

  static isOrderFullyPaid(orderId: string, orderTotalCents: Money): boolean {
    const paid = this.getOrderPaidAmount(orderId);
    return paid >= orderTotalCents;
  }

  static getPayment(paymentId: string): Payment | undefined {
    return this.payments.get(paymentId);
  }

  static clear() {
    this.payments.clear();
    this.allocations.length = 0;
  }
}
