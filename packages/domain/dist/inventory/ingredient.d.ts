import { z } from 'zod';
export declare const IngredientSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    name: z.ZodString;
    baseUnit: z.ZodEnum<["G", "ML", "UNIT"]>;
    minStockThreshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    organizationId: string;
    name: string;
    baseUnit: "G" | "ML" | "UNIT";
    minStockThreshold: number;
}, {
    id: string;
    organizationId: string;
    name: string;
    baseUnit: "G" | "ML" | "UNIT";
    minStockThreshold?: number | undefined;
}>;
export type Ingredient = z.infer<typeof IngredientSchema>;
//# sourceMappingURL=ingredient.d.ts.map