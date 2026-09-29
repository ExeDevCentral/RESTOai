import type { JournalEntry } from './journalEntry.js';
export interface SaleJournalParams {
    organizationId: string;
    locationId: string;
    orderId: string;
    totalAmountCents: bigint;
    paymentMethod: 'CASH' | 'DIGITAL';
    vatRatePercent?: number;
}
export interface WasteJournalParams {
    organizationId: string;
    locationId: string;
    costCents: bigint;
    reason: string;
    referenceId: string;
}
export declare class JournalAutomator {
    /**
     * Genera y asienta automáticamente la partida doble para una venta cerrada.
     * Débito: Caja o Banco por el total.
     * Crédito: Ingresos por Ventas (Neto) e IVA Débito Fiscal (21%).
     */
    static postSale(params: SaleJournalParams): JournalEntry;
    /**
     * Genera y asienta automáticamente la partida doble para una merma o desperdicio de cocina.
     * Débito: Pérdidas por Mermas y Desperdicios (5.1.02)
     * Crédito: Inventario Insumos (1.1.03)
     */
    static postWaste(params: WasteJournalParams): JournalEntry;
}
//# sourceMappingURL=journalAutomator.d.ts.map