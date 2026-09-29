import { Order } from '../orders/orderTypes.js';
import { KitchenTicket, KitchenTicketState } from './kitchenTicket.js';
export declare class KitchenDispatcher {
    private static readonly tickets;
    private static readonly VALID_TRANSITIONS;
    static dispatchOrder(order: Order): KitchenTicket[];
    static transitionTicket(ticketId: string, nextState: KitchenTicketState): KitchenTicket;
    static getTicket(ticketId: string): KitchenTicket | undefined;
    static isOrderFullyReady(orderId: string): boolean;
    static clearDispatcher(): void;
}
//# sourceMappingURL=kitchenDispatcher.d.ts.map