import { z } from 'zod';
export declare const MoneySchema: z.ZodBigInt;
export type Money = z.infer<typeof MoneySchema>;
export declare const WeightGramsSchema: z.ZodNumber;
export type WeightGrams = z.infer<typeof WeightGramsSchema>;
export declare const VolumeMlSchema: z.ZodNumber;
export type VolumeMl = z.infer<typeof VolumeMlSchema>;
//# sourceMappingURL=primitives.d.ts.map