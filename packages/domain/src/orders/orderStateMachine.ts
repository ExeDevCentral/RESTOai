import { Order, OrderState } from './orderTypes.js';

export class OrderStateMachine {
  private static readonly VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PREPARATION', 'CANCELLED'],
    IN_PREPARATION: ['READY', 'CANCELLED'],
    READY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['CLOSED'],
    CANCELLED: [],
    CLOSED: []
  };

  static createOrder(params: Omit<Order, 'state' | 'createdAt' | 'updatedAt' | 'totalCents'>): Order {
    const totalCents = params.items.reduce((sum, item) => sum + (item.unitPriceCents * BigInt(item.quantity)), 0n);
    const now = new Date().toISOString();

    return {
      ...params,
      state: 'DRAFT',
      totalCents,
      createdAt: now,
      updatedAt: now
    };
  }

  static canTransition(currentState: OrderState, nextState: OrderState): boolean {
    return this.VALID_TRANSITIONS[currentState]?.includes(nextState) ?? false;
  }

  static transition(order: Order, nextState: OrderState): Order {
    if (!this.canTransition(order.state, nextState)) {
      throw new Error(`Invalid state transition from ${order.state} to ${nextState}`);
    }

    order.state = nextState;
    order.updatedAt = new Date().toISOString();
    return order;
  }
}
