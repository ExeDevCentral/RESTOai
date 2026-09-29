import { Money } from '../primitives.js';
export type PaymentMethod = 'CASH' | 'MERCADO_PAGO' | 'CARD_TERMINAL';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';
export interface Payment {
    id: string;
    orderId: string;
    organizationId: string;
    locationId: string;
    amountCents: Money;
    method: PaymentMethod;
    status: PaymentStatus;
    externalId?: string;
    actorId: string;
    createdAt: string;
}
export interface PaymentAllocation {
    id: string;
    orderId: string;
    paymentId: string;
    allocatedAmountCents: Money;
    allocatedAt: string;
}
//# sourceMappingURL=paymentTypes.d.ts.map