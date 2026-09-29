import { StockLot, StockMovement } from './stockMovement.js';
export declare class InventoryLedger {
    private static readonly lots;
    private static readonly movements;
    static receiveLot(params: Omit<StockLot, 'availableQuantity' | 'physicalQuantity' | 'createdAt'>): StockLot;
    static recordMovement(data: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement;
    static getLot(lotId: string): StockLot | undefined;
    static getAvailableStock(lotId: string): number;
    static getPhysicalStock(lotId: string): number;
    static getLotsForIngredient(ingredientId: string): StockLot[];
    static clear(): void;
}
//# sourceMappingURL=inventoryLedger.d.ts.map