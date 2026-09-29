import { z } from 'zod';
import { MoneySchema } from '../primitives.js';
import { KitchenStationSchema } from '../catalog/menuItem.js';

export const OrderStateSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'CLOSED'
]);
export type OrderState = z.infer<typeof OrderStateSchema>;

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: bigint;
  station: z.infer<typeof KitchenStationSchema>;
  notes?: string;
}

export interface Order {
  id: string;
  organizationId: string;
  locationId: string;
  tableNumber: string;
  state: OrderState;
  items: OrderItem[];
  totalCents: bigint;
  createdAt: string;
  updatedAt: string;
}
