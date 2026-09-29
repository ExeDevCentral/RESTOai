import { describe, it, expect, beforeEach } from 'vitest';
import { CashSessionManager } from '../src/cash/cashSession.js';

describe('Cash Register Session & Discrepancy Invariants', () => {
  const orgId = 'org-kobe-1';
  const locId = 'loc-centro';
  const cashierId = 'usr-cajero-1';

  beforeEach(() => {
    CashSessionManager.clear();
  });

  it('opens a cash register session with initial float in cents', () => {
    const session = CashSessionManager.openSession({
      organizationId: orgId,
      locationId: locId,
      cashierId,
      initialFloatCents: 5000000n // $50.000,00 iniciales
    });

    expect(session.status).toBe('OPEN');
    expect(session.expectedCashCents).toBe(5000000n);
  });

  it('records cash sales and manual cash movements, updating expected cash balance', () => {
    const session = CashSessionManager.openSession({
      organizationId: orgId,
      locationId: locId,
      cashierId,
      initialFloatCents: 5000000n
    });

    // Venta en efectivo de $20.000
    CashSessionManager.recordCashInflow(session.id, 2000000n, 'SALE', 'ord-101');
    expect(CashSessionManager.getSession(session.id)?.expectedCashCents).toBe(7000000n);

    // Retiro de caja para compra de hielo de emergencia $3.000
    CashSessionManager.recordCashOutflow(session.id, 300000n, 'EXPENSE', 'Compra hielo');
    expect(CashSessionManager.getSession(session.id)?.expectedCashCents).toBe(6700000n);
  });

  it('closes session and calculates exact discrepancy without overwriting real count', () => {
    const session = CashSessionManager.openSession({
      organizationId: orgId,
      locationId: locId,
      cashierId,
      initialFloatCents: 5000000n
    });

    CashSessionManager.recordCashInflow(session.id, 2000000n, 'SALE', 'ord-101');
    // Saldo esperado: $70.000,00

    // Arqueo físico real: el cajero cuenta $68.500,00 (faltan $1.500,00)
    const closedSession = CashSessionManager.closeSession(session.id, 6850000n);

    expect(closedSession.status).toBe('CLOSED');
    expect(closedSession.expectedCashCents).toBe(7000000n);
    expect(closedSession.actualCashCents).toBe(6850000n);
    expect(closedSession.discrepancyCents).toBe(-150000n); // Faltante exacto
  });
});
