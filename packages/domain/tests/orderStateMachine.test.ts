import { describe, it, expect } from 'vitest';
import { OrderStateMachine } from '../src/orders/orderStateMachine.js';

describe('Order State Machine Invariants', () => {
  it('follows the strict operational order progression: DRAFT -> CONFIRMED -> IN_PREPARATION -> READY -> DELIVERED -> CLOSED', () => {
    const order = OrderStateMachine.createOrder({
      id: 'ord-101',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-01',
      items: [
        { menuItemId: 'item-bife', name: 'Bife Madurado', quantity: 2, unitPriceCents: 2450000n, station: 'GRILL' }
      ]
    });

    expect(order.state).toBe('DRAFT');

    OrderStateMachine.transition(order, 'CONFIRMED');
    expect(order.state).toBe('CONFIRMED');

    OrderStateMachine.transition(order, 'IN_PREPARATION');
    expect(order.state).toBe('IN_PREPARATION');

    OrderStateMachine.transition(order, 'READY');
    expect(order.state).toBe('READY');

    OrderStateMachine.transition(order, 'DELIVERED');
    expect(order.state).toBe('DELIVERED');

    OrderStateMachine.transition(order, 'CLOSED');
    expect(order.state).toBe('CLOSED');
  });

  it('rejects invalid state jumps (e.g. DRAFT directly to READY or DELIVERED)', () => {
    const order = OrderStateMachine.createOrder({
      id: 'ord-102',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-02',
      items: []
    });

    expect(() => {
      OrderStateMachine.transition(order, 'READY');
    }).toThrow('Invalid state transition from DRAFT to READY');
  });

  it('allows cancellation before delivery but forbids cancelling DELIVERED or CLOSED orders', () => {
    const order = OrderStateMachine.createOrder({
      id: 'ord-103',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-03',
      items: []
    });

    OrderStateMachine.transition(order, 'CONFIRMED');
    OrderStateMachine.transition(order, 'CANCELLED');
    expect(order.state).toBe('CANCELLED');

    const closedOrder = OrderStateMachine.createOrder({
      id: 'ord-104',
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      tableNumber: 'M-04',
      items: []
    });
    OrderStateMachine.transition(closedOrder, 'CONFIRMED');
    OrderStateMachine.transition(closedOrder, 'IN_PREPARATION');
    OrderStateMachine.transition(closedOrder, 'READY');
    OrderStateMachine.transition(closedOrder, 'DELIVERED');
    OrderStateMachine.transition(closedOrder, 'CLOSED');

    expect(() => {
      OrderStateMachine.transition(closedOrder, 'CANCELLED');
    }).toThrow();
  });
});
