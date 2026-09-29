import { Payment } from './paymentTypes.js';
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
export declare class PaymentService {
    private static readonly payments;
    private static readonly allocations;
    static recordPayment(params: RecordPaymentParams): Payment;
    static getOrderPaidAmount(orderId: string): Money;
    static isOrderFullyPaid(orderId: string, orderTotalCents: Money): boolean;
    static getPayment(paymentId: string): Payment | undefined;
    static clear(): void;
}
//# sourceMappingURL=paymentService.d.ts.map