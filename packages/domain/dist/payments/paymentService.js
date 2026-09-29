import { CashSessionManager } from '../cash/cashSession.js';
export class PaymentService {
    static payments = new Map();
    static allocations = [];
    static recordPayment(params) {
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
        const payment = {
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
    static getOrderPaidAmount(orderId) {
        return this.allocations
            .filter(a => a.orderId === orderId)
            .reduce((sum, a) => sum + a.allocatedAmountCents, 0n);
    }
    static isOrderFullyPaid(orderId, orderTotalCents) {
        const paid = this.getOrderPaidAmount(orderId);
        return paid >= orderTotalCents;
    }
    static getPayment(paymentId) {
        return this.payments.get(paymentId);
    }
    static clear() {
        this.payments.clear();
        this.allocations.length = 0;
    }
}
//# sourceMappingURL=paymentService.js.map