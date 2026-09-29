import { describe, it, expect } from 'vitest';
import { KitchenDispatcher } from '../src/kitchen/kitchenDispatcher.js';
import { Order } from '../src/orders/orderTypes.js';

describe('Kitchen Display System (KDS) & Dispatcher Invariants', () => {
  it('splits confirmed order items across specialized kitchen stations (GRILL, PASTA_OVEN, BAR)', () => {
    const order: Order = {
      id: 'ord-split-1',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-05',
      state: 'CONFIRMED',
      totalCents: 5000000n,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { menuItemId: 'item-1', name: 'Ojo de Bife', quantity: 2, unitPriceCents: 2000000n, station: 'GRILL' },
        { menuItemId: 'item-2', name: 'Raviolones', quantity: 1, unitPriceCents: 1000000n, station: 'PASTA_OVEN' },
        { menuItemId: 'item-3', name: 'Negroni', quantity: 2, unitPriceCents: 850000n, station: 'BAR' }
      ]
    };

    const tickets = KitchenDispatcher.dispatchOrder(order);
    expect(tickets).toHaveLength(3);

    const grillTicket = tickets.find(t => t.station === 'GRILL');
    expect(grillTicket).toBeDefined();
    expect(grillTicket!.items[0].name).toBe('Ojo de Bife');
    expect(grillTicket!.state).toBe('QUEUED');
  });

  it('manages ticket transitions: QUEUED -> PREPARING -> READY and determines if whole order is ready', () => {
    const order: Order = {
      id: 'ord-kds-2',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-06',
      state: 'CONFIRMED',
      totalCents: 2000000n,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { menuItemId: 'item-1', name: 'Ojo de Bife', quantity: 1, unitPriceCents: 2000000n, station: 'GRILL' }
      ]
    };

    const tickets = KitchenDispatcher.dispatchOrder(order);
    const ticket = tickets[0];

    KitchenDispatcher.transitionTicket(ticket.id, 'PREPARING');
    expect(KitchenDispatcher.getTicket(ticket.id)?.state).toBe('PREPARING');

    KitchenDispatcher.transitionTicket(ticket.id, 'READY');
    expect(KitchenDispatcher.getTicket(ticket.id)?.state).toBe('READY');

    expect(KitchenDispatcher.isOrderFullyReady(order.id)).toBe(true);
  });
});
