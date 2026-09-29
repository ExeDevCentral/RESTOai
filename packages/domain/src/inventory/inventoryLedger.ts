import { StockLot, StockMovement, MovementType } from './stockMovement.js';

export class InventoryLedger {
  private static readonly lots = new Map<string, StockLot>();
  private static readonly movements: StockMovement[] = [];

  static receiveLot(params: Omit<StockLot, 'availableQuantity' | 'physicalQuantity' | 'createdAt'>): StockLot {
    const now = new Date().toISOString();
    const lot: StockLot = {
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

  static recordMovement(data: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement {
    const lot = this.lots.get(data.lotId);
    if (!lot) throw new Error(`Stock lot not found: ${data.lotId}`);

    const movement: StockMovement = {
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

  static getLot(lotId: string): StockLot | undefined {
    return this.lots.get(lotId);
  }

  static getAvailableStock(lotId: string): number {
    return this.lots.get(lotId)?.availableQuantity ?? 0;
  }

  static getPhysicalStock(lotId: string): number {
    return this.lots.get(lotId)?.physicalQuantity ?? 0;
  }

  static getLotsForIngredient(ingredientId: string): StockLot[] {
    return Array.from(this.lots.values())
      .filter(l => l.ingredientId === ingredientId && l.availableQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  static clear() {
    this.lots.clear();
    this.movements.length = 0;
  }
}
