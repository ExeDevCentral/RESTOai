export class OrderStateMachine {
    static VALID_TRANSITIONS = {
        DRAFT: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['IN_PREPARATION', 'CANCELLED'],
        IN_PREPARATION: ['READY', 'CANCELLED'],
        READY: ['DELIVERED', 'CANCELLED'],
        DELIVERED: ['CLOSED'],
        CANCELLED: [],
        CLOSED: []
    };
    static createOrder(params) {
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
    static canTransition(currentState, nextState) {
        return this.VALID_TRANSITIONS[currentState]?.includes(nextState) ?? false;
    }
    static transition(order, nextState) {
        if (!this.canTransition(order.state, nextState)) {
            throw new Error(`Invalid state transition from ${order.state} to ${nextState}`);
        }
        order.state = nextState;
        order.updatedAt = new Date().toISOString();
        return order;
    }
}
//# sourceMappingURL=orderStateMachine.js.map