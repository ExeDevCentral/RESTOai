import { Money } from '../primitives.js';
export type TaxCategory = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'CONSUMIDOR_FINAL' | 'EXENTO';
export type InvoiceType = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
export interface TaxPayerInfo {
    cuit?: string;
    taxCategory: TaxCategory;
    businessName?: string;
    pointOfSale?: number;
}
export interface InvoiceRequest {
    organizationId: string;
    locationId: string;
    orderId: string;
    seller: TaxPayerInfo;
    buyer: TaxPayerInfo;
    totalAmountCents: Money;
    vatRatePercent?: number;
}
export interface ElectronicInvoice {
    id: string;
    invoiceType: InvoiceType;
    pointOfSale: number;
    invoiceNumber: number;
    organizationId: string;
    locationId: string;
    orderId: string;
    sellerCuit: string;
    buyerCategory: TaxCategory;
    buyerCuit?: string;
    netAmountCents: Money;
    vatAmountCents: Money;
    totalAmountCents: Money;
    cae: string;
    caeExpirationDate: string;
    issuedAt: string;
}
export declare class FiscalEngine {
    private static sequenceCounter;
    /**
     * Determina el tipo de comprobante según normativa fiscal argentina (ARCA / ex-AFIP):
     * - Emisor Monotributo -> Siempre FACTURA_C
     * - Emisor Responsable Inscripto + Receptor Responsable Inscripto -> FACTURA_A
     * - Emisor Responsable Inscripto + Receptor Consumidor Final / Exento -> FACTURA_B
     */
    static determineInvoiceType(seller: TaxCategory, buyer: TaxCategory): InvoiceType;
    static issueInvoice(request: InvoiceRequest): ElectronicInvoice;
}
//# sourceMappingURL=fiscalEngine.d.ts.map