import { z } from 'zod';
import { KitchenStationSchema } from '../catalog/menuItem.js';
import { OrderItem } from '../orders/orderTypes.js';
export declare const KitchenTicketStateSchema: z.ZodEnum<["QUEUED", "PREPARING", "READY", "CANCELLED"]>;
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
//# sourceMappingURL=kitchenTicket.d.ts.map