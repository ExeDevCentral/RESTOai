import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryLedger } from '../src/inventory/inventoryLedger.js';

describe('Stock Lot & Immutable Movement Invariants', () => {
  beforeEach(() => {
    InventoryLedger.clear();
  });

  it('receives merchandise into a StockLot and computes accurate available balance', () => {
    const lot = InventoryLedger.receiveLot({
      lotId: 'lot-carne-01',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      ingredientId: 'ing-lomo',
      supplierId: 'sup-cabaña-las-lilas',
      initialQuantity: 20000, // 20.000 gramos
      expiryDate: '2026-10-15',
      costPerUnitCents: 1500n // $15 por gramo
    });

    expect(lot.availableQuantity).toBe(20000);
    expect(InventoryLedger.getAvailableStock('lot-carne-01')).toBe(20000);
  });

  it('maintains double-movement ledger: reservation reduces free stock without consuming lot physically', () => {
    InventoryLedger.receiveLot({
      lotId: 'lot-carne-02',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      ingredientId: 'ing-lomo',
      supplierId: 'sup-cabaña',
      initialQuantity: 10000,
      expiryDate: '2026-10-10',
      costPerUnitCents: 1500n
    });

    // Reserva 800g al confirmar orden
    InventoryLedger.recordMovement({
      lotId: 'lot-carne-02',
      type: 'RESERVATION',
      quantity: 800,
      actorId: 'usr-waiter-1',
      referenceId: 'ord-101'
    });

    expect(InventoryLedger.getAvailableStock('lot-carne-02')).toBe(9200);

    // Consumo definitivo al entrar a cocina
    InventoryLedger.recordMovement({
      lotId: 'lot-carne-02',
      type: 'CONSUMPTION',
      quantity: 800,
      actorId: 'usr-chef-1',
      referenceId: 'ord-101'
    });

    expect(InventoryLedger.getAvailableStock('lot-carne-02')).toBe(9200);
    expect(InventoryLedger.getPhysicalStock('lot-carne-02')).toBe(9200);
  });
});
