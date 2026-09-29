import { WeightGrams, VolumeMl } from '../primitives.js';
export type WeightUnit = 'KG' | 'G';
export type VolumeUnit = 'L' | 'ML';
export declare class UnitConverter {
    static toGrams(amount: number, unit: WeightUnit): WeightGrams;
    static toMl(amount: number, unit: VolumeUnit): VolumeMl;
}
//# sourceMappingURL=units.d.ts.map