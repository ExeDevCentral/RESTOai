export class CashSessionManager {
    static sessions = new Map();
    static openSession(params) {
        const sessionId = `cash-sess-${crypto.randomUUID().slice(0, 8)}`;
        const session = {
            id: sessionId,
            ...params,
            status: 'OPEN',
            expectedCashCents: params.initialFloatCents,
            openedAt: new Date().toISOString()
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    static getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    static getActiveSession(locationId) {
        return Array.from(this.sessions.values()).find(s => s.locationId === locationId && s.status === 'OPEN');
    }
    static recordCashInflow(sessionId, amountCents, type, referenceId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'OPEN') {
            throw new Error(`Cannot record cash inflow: session ${sessionId} is not open`);
        }
        session.expectedCashCents += amountCents;
    }
    static recordCashOutflow(sessionId, amountCents, type, reason) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'OPEN') {
            throw new Error(`Cannot record cash outflow: session ${sessionId} is not open`);
        }
        session.expectedCashCents -= amountCents;
    }
    static closeSession(sessionId, actualCashCents) {
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
//# sourceMappingURL=cashSession.js.map