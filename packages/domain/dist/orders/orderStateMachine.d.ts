import { Order, OrderState } from './orderTypes.js';
export declare class OrderStateMachine {
    private static readonly VALID_TRANSITIONS;
    static createOrder(params: Omit<Order, 'state' | 'createdAt' | 'updatedAt' | 'totalCents'>): Order;
    static canTransition(currentState: OrderState, nextState: OrderState): boolean;
    static transition(order: Order, nextState: OrderState): Order;
}
//# sourceMappingURL=orderStateMachine.d.ts.map