import { z } from 'zod';
export const IngredientSchema = z.object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    name: z.string().min(1),
    baseUnit: z.enum(['G', 'ML', 'UNIT']),
    minStockThreshold: z.number().int().nonnegative().default(1000)
});
//# sourceMappingURL=ingredient.js.map