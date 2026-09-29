import { Order } from '../orders/orderTypes.js';
import { KitchenTicket, KitchenTicketState } from './kitchenTicket.js';
import { KitchenStation } from '../catalog/menuItem.js';

export class KitchenDispatcher {
  private static readonly tickets = new Map<string, KitchenTicket>();

  private static readonly VALID_TRANSITIONS: Record<KitchenTicketState, KitchenTicketState[]> = {
    QUEUED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: [],
    CANCELLED: []
  };

  static dispatchOrder(order: Order): KitchenTicket[] {
    const stationMap = new Map<KitchenStation, typeof order.items>();

    for (const item of order.items) {
      if (!stationMap.has(item.station)) {
        stationMap.set(item.station, []);
      }
      stationMap.get(item.station)!.push(item);
    }

    const createdTickets: KitchenTicket[] = [];
    const now = new Date().toISOString();

    for (const [station, items] of stationMap.entries()) {
      const ticketId = `ticket-${order.id}-${station}`;
      const ticket: KitchenTicket = {
        id: ticketId,
        orderId: order.id,
        organizationId: order.organizationId,
        locationId: order.locationId,
        tableNumber: order.tableNumber,
        station,
        state: 'QUEUED',
        items,
        createdAt: now,
        updatedAt: now
      };
      this.tickets.set(ticketId, ticket);
      createdTickets.push(ticket);
    }

    return createdTickets;
  }

  static transitionTicket(ticketId: string, nextState: KitchenTicketState): KitchenTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) throw new Error(`Kitchen ticket not found: ${ticketId}`);

    const allowed = this.VALID_TRANSITIONS[ticket.state]?.includes(nextState);
    if (!allowed) {
      throw new Error(`Invalid kitchen ticket transition from ${ticket.state} to ${nextState}`);
    }

    ticket.state = nextState;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  static getTicket(ticketId: string): KitchenTicket | undefined {
    return this.tickets.get(ticketId);
  }

  static isOrderFullyReady(orderId: string): boolean {
    const orderTickets = Array.from(this.tickets.values()).filter(t => t.orderId === orderId);
    if (orderTickets.length === 0) return false;
    return orderTickets.every(t => t.state === 'READY' || t.state === 'CANCELLED');
  }

  static clearDispatcher() {
    this.tickets.clear();
  }
}
