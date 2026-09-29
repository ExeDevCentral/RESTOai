import { z } from 'zod';
export declare const KitchenStationSchema: z.ZodEnum<["GRILL", "PASTA_OVEN", "COLD_APPETIZERS", "DESSERTS", "BAR"]>;
export type KitchenStation = z.infer<typeof KitchenStationSchema>;
export declare const MenuItemSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    station: z.ZodEnum<["GRILL", "PASTA_OVEN", "COLD_APPETIZERS", "DESSERTS", "BAR"]>;
    priceCents: z.ZodBigInt;
    allergens: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    organizationId: string;
    name: string;
    isActive: boolean;
    category: string;
    station: "GRILL" | "PASTA_OVEN" | "COLD_APPETIZERS" | "DESSERTS" | "BAR";
    priceCents: bigint;
    allergens: string[];
}, {
    id: string;
    organizationId: string;
    name: string;
    category: string;
    station: "GRILL" | "PASTA_OVEN" | "COLD_APPETIZERS" | "DESSERTS" | "BAR";
    priceCents: bigint;
    isActive?: boolean | undefined;
    allergens?: string[] | undefined;
}>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
//# sourceMappingURL=menuItem.d.ts.map