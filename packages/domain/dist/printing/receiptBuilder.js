export class ReceiptBuilder {
    /**
     * Genera el ID corto de verificación de 8 caracteres tipo 7F3A-91C2
     */
    static generateVerificationCode(hashOrId) {
        const clean = hashOrId.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
        const pad = (clean + '00000000').slice(0, 8);
        return `${pad.slice(0, 4)}-${pad.slice(4, 8)}`;
    }
    /**
     * Construye el DTO unificado del ticket moderno a partir de la orden e invoice
     */
    static buildReceipt(params) {
        const { order, invoice, isReprint = false, reprintCount = 0, paymentMethod = 'Mercado Pago (QR)' } = params;
        const shortHash = this.generateVerificationCode(params.orderHash || String(order.id));
        const items = order.items.map(i => {
            const priceCents = i.unitPriceCents ?? BigInt(Math.round((i.price || 0) * 100));
            const subCents = priceCents * BigInt(i.quantity);
            return {
                name: i.name,
                quantity: i.quantity,
                unitPriceCents: priceCents,
                subtotalCents: subCents,
                notes: i.notes
            };
        });
        const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0n);
        const tipSuggestedCents = (subtotalCents * 10n) / 100n;
        const totalCents = order.totalAmountCents ?? BigInt(Math.round((order.total || 0) * 100));
        const formattedInvoice = invoice ? {
            type: invoice.invoiceType,
            number: `${String(invoice.pointOfSale).padStart(4, '0')}-${String(invoice.invoiceNumber).padStart(8, '0')}`,
            cae: invoice.cae,
            caeExpirationDate: invoice.caeExpirationDate,
            vatAmountCents: invoice.vatAmountCents,
            netAmountCents: invoice.netAmountCents
        } : {
            type: 'PRE_BILL',
            number: `PRE-${String(order.id).slice(-6)}`
        };
        const verificationUrl = `https://kobe.rest/v/${shortHash}`;
        const fiscalQrUrl = invoice ? `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify({
            ver: 1,
            fecha: new Date().toISOString().slice(0, 10),
            cuit: 30123456789,
            ptoVta: invoice.pointOfSale,
            tipoCmp: invoice.invoiceType === 'FACTURA_A' ? 1 : 6,
            nroCmp: invoice.invoiceNumber,
            importe: Number(totalCents) / 100,
            moneda: 'PES',
            ctz: 1,
            codAut: Number(invoice.cae)
        })).toString('base64')}` : undefined;
        return {
            orderId: String(order.id),
            orderShortHash: shortHash,
            tableNumber: String(order.tableNumber),
            waiterName: order.waiter || 'Personal de Salón',
            issuedAt: new Date().toISOString(),
            isReprint,
            reprintCount,
            business: {
                name: 'KOBE GASTRONOMIA S.R.L.',
                fantasyName: 'KOBE · PARRILLA & BISTRO',
                address: 'Av. Pellegrini 1234 · Rosario',
                cuit: '30-12345678-9',
                taxCategory: 'IVA Responsable Inscripto',
                iibb: '901-284910-4',
                pointOfSale: invoice?.pointOfSale || 4
            },
            invoice: formattedInvoice,
            items,
            subtotalCents,
            tipSuggestedCents,
            totalCents: totalCents > 0n ? totalCents : subtotalCents,
            paymentMethod,
            verificationUrl,
            fiscalQrUrl,
            footerMessage: 'Gracias por elegirnos ♥ @kobe.rosario'
        };
    }
}
//# sourceMappingURL=receiptBuilder.js.map