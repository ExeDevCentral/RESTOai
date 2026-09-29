import { WeightGramsSchema, VolumeMlSchema } from '../primitives.js';
export class UnitConverter {
    static toGrams(amount, unit) {
        if (amount < 0)
            throw new Error('Weight amount cannot be negative');
        if (unit === 'KG') {
            return WeightGramsSchema.parse(Math.round(amount * 1000));
        }
        return WeightGramsSchema.parse(Math.round(amount));
    }
    static toMl(amount, unit) {
        if (amount < 0)
            throw new Error('Volume amount cannot be negative');
        if (unit === 'L') {
            return VolumeMlSchema.parse(Math.round(amount * 1000));
        }
        return VolumeMlSchema.parse(Math.round(amount));
    }
}
//# sourceMappingURL=units.js.map