import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryLedger } from '../src/inventory/inventoryLedger.js';
import { FefoAllocator } from '../src/inventory/fefoAllocator.js';
import { Recipe } from '../src/inventory/recipe.js';

describe('FEFO (First Expired, First Out) Allocator Invariants', () => {
  const orgId = 'org-kobe-1';
  const locId = 'loc-centro';
  const ingredientCarne = 'ing-ojo-bife';

  const bifeRecipe = new Recipe({
    id: 'rec-ojo-bife',
    menuItemId: 'item-ojo-bife',
    name: 'Ojo de Bife con Puré',
    ingredients: [
      { ingredientId: ingredientCarne, quantity: 400, unit: 'G' }
    ]
  });

  beforeEach(() => {
    InventoryLedger.clear();
    FefoAllocator.clear();
    FefoAllocator.registerRecipe(bifeRecipe);

    // Lote A: Vence en 3 días (2026-10-02), 1.000g disponibles
    InventoryLedger.receiveLot({
      lotId: 'lot-vence-pronto',
      organizationId: orgId,
      locationId: locId,
      ingredientId: ingredientCarne,
      supplierId: 'sup-1',
      initialQuantity: 1000,
      expiryDate: '2026-10-02',
      costPerUnitCents: 1500n
    });

    // Lote B: Vence en 10 días (2026-10-09), 5.000g disponibles
    InventoryLedger.receiveLot({
      lotId: 'lot-vence-despues',
      organizationId: orgId,
      locationId: locId,
      ingredientId: ingredientCarne,
      supplierId: 'sup-1',
      initialQuantity: 5000,
      expiryDate: '2026-10-09',
      costPerUnitCents: 1500n
    });
  });

  it('strictly allocates stock from the earliest expiring lot first (FEFO)', () => {
    // Pedir 2 porciones de Ojo de Bife = 800g requeridos
    const reservations = FefoAllocator.reserveForOrder({
      orderId: 'ord-fefo-01',
      menuItemId: 'item-ojo-bife',
      quantity: 2,
      actorId: 'usr-waiter-1'
    });

    expect(reservations).toHaveLength(1);
    expect(reservations[0].lotId).toBe('lot-vence-pronto');
    expect(reservations[0].reservedQuantity).toBe(800);

    // El lote próximo a vencer queda con 200g
    expect(InventoryLedger.getAvailableStock('lot-vence-pronto')).toBe(200);
    // El lote posterior queda intacto
    expect(InventoryLedger.getAvailableStock('lot-vence-despues')).toBe(5000);
  });

  it('splits allocations across multiple lots when the earliest lot has partial stock', () => {
    // Pedir 3 porciones de Ojo de Bife = 1.200g requeridos
    // El lote pronto tiene 1.000g; debe tomar 1.000g del primero y 200g del segundo
    const reservations = FefoAllocator.reserveForOrder({
      orderId: 'ord-fefo-02',
      menuItemId: 'item-ojo-bife',
      quantity: 3,
      actorId: 'usr-waiter-1'
    });

    expect(reservations).toHaveLength(2);
    expect(reservations[0].lotId).toBe('lot-vence-pronto');
    expect(reservations[0].reservedQuantity).toBe(1000);

    expect(reservations[1].lotId).toBe('lot-vence-despues');
    expect(reservations[1].reservedQuantity).toBe(200);

    expect(InventoryLedger.getAvailableStock('lot-vence-pronto')).toBe(0);
    expect(InventoryLedger.getAvailableStock('lot-vence-despues')).toBe(4800);
  });

  it('rejects order reservation when total available stock across all lots is insufficient', () => {
    expect(() => {
      // 20 porciones = 8.000g requeridos (solo hay 6.000g en total)
      FefoAllocator.reserveForOrder({
        orderId: 'ord-fefo-exceso',
        menuItemId: 'item-ojo-bife',
        quantity: 20,
        actorId: 'usr-waiter-1'
      });
    }).toThrow('InsufficientStockError');
  });

  it('releases reservations when order is cancelled before cooking', () => {
    FefoAllocator.reserveForOrder({
      orderId: 'ord-fefo-cancel',
      menuItemId: 'item-ojo-bife',
      quantity: 1, // 400g
      actorId: 'usr-waiter-1'
    });

    expect(InventoryLedger.getAvailableStock('lot-vence-pronto')).toBe(600);

    // Cancelar orden
    FefoAllocator.handleOrderCancellation('ord-fefo-cancel', false, 'usr-waiter-1');
    expect(InventoryLedger.getAvailableStock('lot-vence-pronto')).toBe(1000);
  });

  it('records WASTE when order is cancelled after entering kitchen preparation', () => {
    FefoAllocator.reserveForOrder({
      orderId: 'ord-fefo-waste',
      menuItemId: 'item-ojo-bife',
      quantity: 1, // 400g
      actorId: 'usr-waiter-1'
    });

    // Pasa a cocina (consumo real)
    FefoAllocator.consumeReservation('ord-fefo-waste', 'usr-chef-1');

    // Cancelación en cocina genera merma (WASTE)
    FefoAllocator.handleOrderCancellation('ord-fefo-waste', true, 'usr-chef-1', 'KITCHEN_ACCIDENT');

    // El stock físico se consumió / descartó
    expect(InventoryLedger.getPhysicalStock('lot-vence-pronto')).toBe(600);
  });
});
