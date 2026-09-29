import { Recipe } from './recipe.js';
export interface LotAllocation {
    lotId: string;
    ingredientId: string;
    reservedQuantity: number;
}
export interface ReserveParams {
    orderId: string;
    menuItemId: string;
    quantity: number;
    actorId: string;
}
export declare class FefoAllocator {
    private static readonly recipes;
    private static readonly orderReservations;
    static registerRecipe(recipe: Recipe): void;
    static reserveForOrder(params: ReserveParams): LotAllocation[];
    static consumeReservation(orderId: string, actorId: string): void;
    static handleOrderCancellation(orderId: string, wasCooking: boolean, actorId: string, wasteReason?: string): void;
    static clear(): void;
}
//# sourceMappingURL=fefoAllocator.d.ts.map