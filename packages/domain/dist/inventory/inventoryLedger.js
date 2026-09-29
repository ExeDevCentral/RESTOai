export class InventoryLedger {
    static lots = new Map();
    static movements = [];
    static receiveLot(params) {
        const now = new Date().toISOString();
        const lot = {
            ...params,
            availableQuantity: params.initialQuantity,
            physicalQuantity: params.initialQuantity,
            createdAt: now
        };
        this.lots.set(lot.lotId, lot);
        this.recordMovement({
            lotId: lot.lotId,
            type: 'PURCHASE',
            quantity: params.initialQuantity,
            actorId: 'system',
            referenceId: lot.lotId
        });
        return lot;
    }
    static recordMovement(data) {
        const lot = this.lots.get(data.lotId);
        if (!lot)
            throw new Error(`Stock lot not found: ${data.lotId}`);
        const movement = {
            id: crypto.randomUUID(),
            ...data,
            timestamp: new Date().toISOString()
        };
        // Actualización de balances según tipo de movimiento
        switch (data.type) {
            case 'RESERVATION':
                if (lot.availableQuantity < data.quantity) {
                    throw new Error(`Insufficient available stock in lot ${lot.lotId}`);
                }
                lot.availableQuantity -= data.quantity;
                break;
            case 'RELEASE_RESERVATION':
                lot.availableQuantity += data.quantity;
                break;
            case 'CONSUMPTION':
                lot.physicalQuantity -= data.quantity;
                break;
            case 'WASTE':
                lot.physicalQuantity -= data.quantity;
                break;
            case 'ADJUSTMENT':
                lot.availableQuantity += data.quantity;
                lot.physicalQuantity += data.quantity;
                break;
        }
        this.movements.push(movement);
        return movement;
    }
    static getLot(lotId) {
        return this.lots.get(lotId);
    }
    static getAvailableStock(lotId) {
        return this.lots.get(lotId)?.availableQuantity ?? 0;
    }
    static getPhysicalStock(lotId) {
        return this.lots.get(lotId)?.physicalQuantity ?? 0;
    }
    static getLotsForIngredient(ingredientId) {
        return Array.from(this.lots.values())
            .filter(l => l.ingredientId === ingredientId && l.availableQuantity > 0)
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }
    static clear() {
        this.lots.clear();
        this.movements.length = 0;
    }
}
//# sourceMappingURL=inventoryLedger.js.map