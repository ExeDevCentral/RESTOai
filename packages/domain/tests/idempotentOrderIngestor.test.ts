import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotentOrderIngestor } from '../src/orders/idempotentOrderIngestor.js';
import { AuditLedger } from '../src/auditLedger.js';

describe('Offline Queue & Idempotent Ingestion Invariants', () => {
  beforeEach(() => {
    IdempotentOrderIngestor.clearCache();
    AuditLedger.clearLedger();
  });

  it('ingests a new order and records audit trail', () => {
    const clientUuid = 'd3b07384-d113-46fb-a764-16a7e040f901';

    const result = IdempotentOrderIngestor.ingest({
      clientOrderId: clientUuid,
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-01',
      actorId: 'user-waiter-1',
      items: [
        { menuItemId: 'item-1', name: 'Bife', quantity: 1, unitPriceCents: 2450000n, station: 'GRILL' }
      ]
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.order.id).toBeDefined();
    expect(result.order.state).toBe('CONFIRMED');

    // Audit log emitido
    const audit = AuditLedger.getLedger('org-kobe-1');
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('ORDER_INGESTED');
  });

  it('guarantees idempotency when an offline queue retries with the same clientOrderId', () => {
    const clientUuid = 'd3b07384-d113-46fb-a764-16a7e040f902';

    const firstAttempt = IdempotentOrderIngestor.ingest({
      clientOrderId: clientUuid,
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-02',
      actorId: 'user-waiter-1',
      items: [
        { menuItemId: 'item-1', name: 'Bife', quantity: 1, unitPriceCents: 2450000n, station: 'GRILL' }
      ]
    });

    // Simular reintento de red 2 minutos después con el mismo clientOrderId
    const secondAttempt = IdempotentOrderIngestor.ingest({
      clientOrderId: clientUuid,
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-02',
      actorId: 'user-waiter-1',
      items: [
        { menuItemId: 'item-1', name: 'Bife', quantity: 1, unitPriceCents: 2450000n, station: 'GRILL' }
      ]
    });

    expect(secondAttempt.isDuplicate).toBe(true);
    expect(secondAttempt.order.id).toBe(firstAttempt.order.id);

    // Solo se debe haber creado 1 evento en auditoría
    const audit = AuditLedger.getLedger('org-kobe-1');
    expect(audit).toHaveLength(1);
  });
});
