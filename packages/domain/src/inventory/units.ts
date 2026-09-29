import { WeightGrams, WeightGramsSchema, VolumeMl, VolumeMlSchema } from '../primitives.js';

export type WeightUnit = 'KG' | 'G';
export type VolumeUnit = 'L' | 'ML';

export class UnitConverter {
  static toGrams(amount: number, unit: WeightUnit): WeightGrams {
    if (amount < 0) throw new Error('Weight amount cannot be negative');

    if (unit === 'KG') {
      return WeightGramsSchema.parse(Math.round(amount * 1000));
    }
    return WeightGramsSchema.parse(Math.round(amount));
  }

  static toMl(amount: number, unit: VolumeUnit): VolumeMl {
    if (amount < 0) throw new Error('Volume amount cannot be negative');

    if (unit === 'L') {
      return VolumeMlSchema.parse(Math.round(amount * 1000));
    }
    return VolumeMlSchema.parse(Math.round(amount));
  }
}
