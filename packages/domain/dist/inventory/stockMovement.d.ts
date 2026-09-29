export interface StockLot {
    lotId: string;
    organizationId: string;
    locationId: string;
    ingredientId: string;
    supplierId: string;
    initialQuantity: number;
    availableQuantity: number;
    physicalQuantity: number;
    expiryDate: string;
    costPerUnitCents: bigint;
    createdAt: string;
}
export type MovementType = 'PURCHASE' | 'RESERVATION' | 'RELEASE_RESERVATION' | 'CONSUMPTION' | 'TRANSFER' | 'ADJUSTMENT' | 'WASTE' | 'RETURN';
export interface StockMovement {
    id: string;
    lotId: string;
    type: MovementType;
    quantity: number;
    actorId: string;
    referenceId: string;
    timestamp: string;
    reason?: string;
}
//# sourceMappingURL=stockMovement.d.ts.map