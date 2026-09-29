import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLedger } from '../../domain/src/auditLedger.js';

describe('Tamper-Proof Audit Ledger Invariants', () => {
  const orgId = 'org-kobe-rosario';

  beforeEach(() => {
    AuditLedger.clearLedger();
  });

  it('records chronological append-only events linked by sha256 hash chain', () => {
    const rec1 = AuditLedger.appendRecord({
      organizationId: orgId,
      actorId: 'user-waiter-1',
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: 'ord-101',
      payload: { table: 'M-01', totalCents: 5400000 },
      requestId: 'req-001'
    });

    expect(rec1.prevHash).toBeNull();
    expect(rec1.hash).toBeDefined();

    const rec2 = AuditLedger.appendRecord({
      organizationId: orgId,
      actorId: 'user-chef-1',
      action: 'KITCHEN_TICKET_STARTED',
      entityType: 'KitchenTicket',
      entityId: 'ticket-501',
      payload: { orderId: 'ord-101', station: 'Grill' },
      requestId: 'req-002'
    });

    // Encadenamiento criptográfico estricto
    expect(rec2.prevHash).toBe(rec1.hash);
    expect(AuditLedger.verifyIntegrity(orgId).isValid).toBe(true);
  });

  it('detects tampering or corruption in the audit ledger', () => {
    AuditLedger.appendRecord({
      organizationId: orgId,
      actorId: 'user-1',
      action: 'ORDER_CONFIRMED',
      entityType: 'Order',
      entityId: 'ord-1',
      payload: { amount: 100 },
      requestId: 'req-1'
    });

    AuditLedger.appendRecord({
      organizationId: orgId,
      actorId: 'user-1',
      action: 'PAYMENT_RECEIVED',
      entityType: 'Payment',
      entityId: 'pay-1',
      payload: { amount: 100 },
      requestId: 'req-2'
    });

    // Estado inicial íntegro
    expect(AuditLedger.verifyIntegrity(orgId).isValid).toBe(true);

    // Intento de alteración fraudulenta directa en el ledger
    const records = (AuditLedger as any).records;
    records[0] = {
      ...records[0],
      payload: { amount: 9999999 } // Dato alterado
    };

    const integrityCheck = AuditLedger.verifyIntegrity(orgId);
    expect(integrityCheck.isValid).toBe(false);
    expect(integrityCheck.brokenAtRecordId).toBe(records[0].id);
  });
});
