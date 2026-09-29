import { AccountingLedger } from './accountingLedger.js';
export class JournalAutomator {
    /**
     * Genera y asienta automáticamente la partida doble para una venta cerrada.
     * Débito: Caja o Banco por el total.
     * Crédito: Ingresos por Ventas (Neto) e IVA Débito Fiscal (21%).
     */
    static postSale(params) {
        const vatRate = params.vatRatePercent ?? 21;
        // Neto = (Total * 100) / (100 + tasa)
        const netRevenueCents = (params.totalAmountCents * 100n) / BigInt(100 + vatRate);
        const vatPayableCents = params.totalAmountCents - netRevenueCents;
        const assetAccount = params.paymentMethod === 'CASH' ? '1.1.01' : '1.1.02';
        return AccountingLedger.recordEntry({
            organizationId: params.organizationId,
            locationId: params.locationId,
            description: `Venta Orden #${params.orderId}`,
            lines: [
                {
                    accountCode: assetAccount,
                    debitCents: params.totalAmountCents,
                    creditCents: 0n,
                    description: `Cobro venta orden ${params.orderId}`
                },
                {
                    accountCode: '4.1.01', // Ventas Salón / Mostrador
                    debitCents: 0n,
                    creditCents: netRevenueCents,
                    description: `Ingreso neto orden ${params.orderId}`
                },
                {
                    accountCode: '2.1.01', // IVA Débito Fiscal
                    debitCents: 0n,
                    creditCents: vatPayableCents,
                    description: `IVA Débito Fiscal (${vatRate}%) orden ${params.orderId}`
                }
            ]
        });
    }
    /**
     * Genera y asienta automáticamente la partida doble para una merma o desperdicio de cocina.
     * Débito: Pérdidas por Mermas y Desperdicios (5.1.02)
     * Crédito: Inventario Insumos (1.1.03)
     */
    static postWaste(params) {
        return AccountingLedger.recordEntry({
            organizationId: params.organizationId,
            locationId: params.locationId,
            description: `Merma Cocina: ${params.reason} (${params.referenceId})`,
            lines: [
                {
                    accountCode: '5.1.02', // Costo por Mermas
                    debitCents: params.costCents,
                    creditCents: 0n,
                    description: `Pérdida por merma: ${params.reason}`
                },
                {
                    accountCode: '1.1.03', // Inventario Insumos
                    debitCents: 0n,
                    creditCents: params.costCents,
                    description: `Baja contable stock por merma ${params.referenceId}`
                }
            ]
        });
    }
}
//# sourceMappingURL=journalAutomator.js.map