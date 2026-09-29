export class FiscalEngine {
    static sequenceCounter = 1;
    /**
     * Determina el tipo de comprobante según normativa fiscal argentina (ARCA / ex-AFIP):
     * - Emisor Monotributo -> Siempre FACTURA_C
     * - Emisor Responsable Inscripto + Receptor Responsable Inscripto -> FACTURA_A
     * - Emisor Responsable Inscripto + Receptor Consumidor Final / Exento -> FACTURA_B
     */
    static determineInvoiceType(seller, buyer) {
        if (seller === 'MONOTRIBUTO') {
            return 'FACTURA_C';
        }
        if (seller === 'RESPONSABLE_INSCRIPTO') {
            if (buyer === 'RESPONSABLE_INSCRIPTO') {
                return 'FACTURA_A';
            }
            return 'FACTURA_B';
        }
        return 'FACTURA_B';
    }
    static issueInvoice(request) {
        const invoiceType = this.determineInvoiceType(request.seller.taxCategory, request.buyer.taxCategory);
        const vatRate = request.vatRatePercent ?? 21;
        let netAmountCents;
        let vatAmountCents;
        if (invoiceType === 'FACTURA_C') {
            netAmountCents = request.totalAmountCents;
            vatAmountCents = 0n;
        }
        else {
            // Cálculo de neto e IVA
            netAmountCents = (request.totalAmountCents * 100n) / BigInt(100 + vatRate);
            vatAmountCents = request.totalAmountCents - netAmountCents;
        }
        // Generar CAE simulado válido (14 dígitos numéricos) y fecha de vencimiento a 10 días
        const cae = `74${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        const expDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const invoice = {
            id: `inv-${crypto.randomUUID().slice(0, 8)}`,
            invoiceType,
            pointOfSale: request.seller.pointOfSale ?? 1,
            invoiceNumber: this.sequenceCounter++,
            organizationId: request.organizationId,
            locationId: request.locationId,
            orderId: request.orderId,
            sellerCuit: request.seller.cuit ?? '30000000007',
            buyerCategory: request.buyer.taxCategory,
            buyerCuit: request.buyer.cuit,
            netAmountCents,
            vatAmountCents,
            totalAmountCents: request.totalAmountCents,
            cae,
            caeExpirationDate: expDate,
            issuedAt: new Date().toISOString()
        };
        return Object.freeze(invoice);
    }
}
//# sourceMappingURL=fiscalEngine.js.map