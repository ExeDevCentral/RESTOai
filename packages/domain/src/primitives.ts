import { z } from 'zod';

export const MoneySchema = z.bigint().nonnegative();
export type Money = z.infer<typeof MoneySchema>;

export const WeightGramsSchema = z.number().int().nonnegative();
export type WeightGrams = z.infer<typeof WeightGramsSchema>;

export const VolumeMlSchema = z.number().int().nonnegative();
export type VolumeMl = z.infer<typeof VolumeMlSchema>;
