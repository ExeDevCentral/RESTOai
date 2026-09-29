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

export class CashSessionManager {
  private static readonly sessions = new Map<string, CashRegisterSession>();

  static openSession(params: OpenSessionParams): CashRegisterSession {
    const sessionId = `cash-sess-${crypto.randomUUID().slice(0, 8)}`;
    const session: CashRegisterSession = {
      id: sessionId,
      ...params,
      status: 'OPEN',
      expectedCashCents: params.initialFloatCents,
      openedAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  static getSession(sessionId: string): CashRegisterSession | undefined {
    return this.sessions.get(sessionId);
  }

  static getActiveSession(locationId: string): CashRegisterSession | undefined {
    return Array.from(this.sessions.values()).find(
      s => s.locationId === locationId && s.status === 'OPEN'
    );
  }

  static recordCashInflow(sessionId: string, amountCents: Money, type: string, referenceId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'OPEN') {
      throw new Error(`Cannot record cash inflow: session ${sessionId} is not open`);
    }
    session.expectedCashCents += amountCents;
  }

  static recordCashOutflow(sessionId: string, amountCents: Money, type: string, reason: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'OPEN') {
      throw new Error(`Cannot record cash outflow: session ${sessionId} is not open`);
    }
    session.expectedCashCents -= amountCents;
  }

  static closeSession(sessionId: string, actualCashCents: Money): CashRegisterSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'OPEN') {
      throw new Error(`Cannot close session ${sessionId}: not found or already closed`);
    }

    session.status = 'CLOSED';
    session.actualCashCents = actualCashCents;
    session.discrepancyCents = actualCashCents - session.expectedCashCents;
    session.closedAt = new Date().toISOString();

    return session;
  }

  static clear() {
    this.sessions.clear();
  }
}
