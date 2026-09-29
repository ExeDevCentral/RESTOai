import { z } from 'zod';
import { MoneySchema } from '../primitives.js';
export const KitchenStationSchema = z.enum([
    'GRILL',
    'PASTA_OVEN',
    'COLD_APPETIZERS',
    'DESSERTS',
    'BAR'
]);
export const MenuItemSchema = z.object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    station: KitchenStationSchema,
    priceCents: MoneySchema,
    allergens: z.array(z.string()).default([]),
    isActive: z.boolean().default(true)
});
//# sourceMappingURL=menuItem.js.map