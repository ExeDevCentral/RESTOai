export class ChartOfAccounts {
    accounts = new Map();
    organizationId;
    constructor(organizationId) {
        this.organizationId = organizationId;
        this.seedGastronomicChart();
    }
    seedGastronomicChart() {
        const standardAccounts = [
            // Activos (1)
            { code: '1.1.01', name: 'Caja Efectivo Salón', type: 'ASSET', isActive: true },
            { code: '1.1.02', name: 'Banco Cuenta Corriente / Recaudación MP', type: 'ASSET', isActive: true },
            { code: '1.1.03', name: 'Mercaderías e Insumos en Stock', type: 'ASSET', isActive: true },
            // Pasivos (2)
            { code: '2.1.01', name: 'IVA Débito Fiscal a Pagar', type: 'LIABILITY', isActive: true },
            { code: '2.1.02', name: 'Proveedores a Pagar', type: 'LIABILITY', isActive: true },
            // Ingresos (4)
            { code: '4.1.01', name: 'Ventas de Salón & Gastronomía', type: 'REVENUE', isActive: true },
            // Costos y Gastos (5)
            { code: '5.1.01', name: 'Costo de Mercaderías Vendidas (Food Cost)', type: 'EXPENSE', isActive: true },
            { code: '5.1.02', name: 'Pérdida por Desperdicio y Merma (Waste)', type: 'EXPENSE', isActive: true }
        ];
        for (const acc of standardAccounts) {
            this.accounts.set(acc.code, {
                ...acc,
                organizationId: this.organizationId
            });
        }
    }
    getAccount(code) {
        return this.accounts.get(code);
    }
}
//# sourceMappingURL=chartOfAccounts.js.map