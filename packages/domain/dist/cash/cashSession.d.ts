import { Money } from '../primitives.js';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export interface CashRegisterSession {
    id: string;
    organizationId: string;
    locationId: string;
    cashierId: string;
    status: CashSessionStatus;
    initialFloatCents: Money;
    expectedCashCents: Money;
    actualCashCents?: Money;
    discrepancyCents?: Money;
    openedAt: string;
    closedAt?: string;
}
export interface OpenSessionParams {
    organizationId: string;
    locationId: string;
    cashierId: string;
    initialFloatCents: Money;
}
export declare class CashSessionManager {
    private static readonly sessions;
    static openSession(params: OpenSessionParams): CashRegisterSession;
    static getSession(sessionId: string): CashRegisterSession | undefined;
    static getActiveSession(locationId: string): CashRegisterSession | undefined;
    static recordCashInflow(sessionId: string, amountCents: Money, type: string, referenceId: string): void;
    static recordCashOutflow(sessionId: string, amountCents: Money, type: string, reason: string): void;
    static closeSession(sessionId: string, actualCashCents: Money): CashRegisterSession;
    static clear(): void;
}
//# sourceMappingURL=cashSession.d.ts.map