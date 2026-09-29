import { z } from 'zod';
export const MoneySchema = z.bigint().nonnegative();
export const WeightGramsSchema = z.number().int().nonnegative();
export const VolumeMlSchema = z.number().int().nonnegative();
//# sourceMappingURL=primitives.js.map