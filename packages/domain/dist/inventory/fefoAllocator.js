import { InventoryLedger } from './inventoryLedger.js';
export class FefoAllocator {
    static recipes = new Map();
    // orderId -> allocations
    static orderReservations = new Map();
    static registerRecipe(recipe) {
        this.recipes.set(recipe.menuItemId, recipe);
    }
    static reserveForOrder(params) {
        const recipe = this.recipes.get(params.menuItemId);
        if (!recipe) {
            throw new Error(`Recipe not found for menuItem ${params.menuItemId}`);
        }
        const requirements = recipe.calculateRequirements(params.quantity);
        const orderAllocations = [];
        for (const req of requirements) {
            const lots = InventoryLedger.getLotsForIngredient(req.ingredientId);
            const totalAvailable = lots.reduce((sum, l) => sum + l.availableQuantity, 0);
            if (totalAvailable < req.quantity) {
                throw new Error(`InsufficientStockError: Not enough stock for ingredient ${req.ingredientId}`);
            }
            let remainingToReserve = req.quantity;
            for (const lot of lots) {
                if (remainingToReserve <= 0)
                    break;
                const take = Math.min(lot.availableQuantity, remainingToReserve);
                InventoryLedger.recordMovement({
                    lotId: lot.lotId,
                    type: 'RESERVATION',
                    quantity: take,
                    actorId: params.actorId,
                    referenceId: params.orderId
                });
                orderAllocations.push({
                    lotId: lot.lotId,
                    ingredientId: req.ingredientId,
                    reservedQuantity: take
                });
                remainingToReserve -= take;
            }
        }
        this.orderReservations.set(params.orderId, orderAllocations);
        return orderAllocations;
    }
    static consumeReservation(orderId, actorId) {
        const allocations = this.orderReservations.get(orderId);
        if (!allocations)
            return;
        for (const alloc of allocations) {
            InventoryLedger.recordMovement({
                lotId: alloc.lotId,
                type: 'CONSUMPTION',
                quantity: alloc.reservedQuantity,
                actorId,
                referenceId: orderId
            });
        }
    }
    static handleOrderCancellation(orderId, wasCooking, actorId, wasteReason = 'CUSTOMER_CANCELLED') {
        const allocations = this.orderReservations.get(orderId);
        if (!allocations)
            return;
        for (const alloc of allocations) {
            if (!wasCooking) {
                // Liberar reserva si aún no se cocinó
                InventoryLedger.recordMovement({
                    lotId: alloc.lotId,
                    type: 'RELEASE_RESERVATION',
                    quantity: alloc.reservedQuantity,
                    actorId,
                    referenceId: orderId
                });
            }
            else {
                // Registrar merma (WASTE) en el ledger de auditoría
                InventoryLedger.recordMovement({
                    lotId: alloc.lotId,
                    type: 'WASTE',
                    quantity: 0, // Ya fue descontado físicamente en CONSUMPTION
                    actorId,
                    referenceId: orderId,
                    reason: wasteReason
                });
            }
        }
        this.orderReservations.delete(orderId);
    }
    static clear() {
        this.recipes.clear();
        this.orderReservations.clear();
    }
}
//# sourceMappingURL=fefoAllocator.js.map