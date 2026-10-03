import { describe, it, expect } from 'vitest';
import { db } from './db.js';

describe('Server & Drizzle OrderRepository Seam Integration', () => {
  it('initializes db.orderRepository on server startup', async () => {
    expect(db.orderRepository).toBeDefined();
    expect(typeof db.orderRepository.createOrder).toBe('function');
    expect(typeof db.orderRepository.getOrderById).toBe('function');
    expect(typeof db.orderRepository.listOrders).toBe('function');
    expect(typeof db.orderRepository.updateOrderStatus).toBe('function');
  });

  it('atomically creates order and audit ledger entry through db.orderRepository', async () => {
    const created = await db.orderRepository.createOrder({
      clientOrderId: `test-seam-${Date.now()}`,
      tableNumber: 'M-03',
      actorId: 'usr-waiter-test',
      items: [
        {
          menuItemId: 'dish-1',
          name: 'Bife de Chorizo Madurado',
          quantity: 1,
          unitPriceCents: 2450000n,
          station: 'GRILL'
        }
      ]
    });

    expect(created.id).toBeDefined();
    expect(created.totalCents).toBe(2450000n);

    const timeline = await db.orderRepository.getOrderAuditTimeline(created.id);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].action).toBe('ORDER_CREATED');
    expect(timeline[0].hash).toBeDefined();
  });
});
