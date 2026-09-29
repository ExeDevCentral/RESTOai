import { z } from 'zod';
import { KitchenStationSchema } from '../catalog/menuItem.js';
import { OrderItem } from '../orders/orderTypes.js';

export const KitchenTicketStateSchema = z.enum([
  'QUEUED',
  'PREPARING',
  'READY',
  'CANCELLED'
]);
export type KitchenTicketState = z.infer<typeof KitchenTicketStateSchema>;

export interface KitchenTicket {
  id: string;
  orderId: string;
  organizationId: string;
  locationId: string;
  tableNumber: string;
  station: z.infer<typeof KitchenStationSchema>;
  state: KitchenTicketState;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
