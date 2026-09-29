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
  vatRatePercent?: number; // Por defecto 21%
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

export class FiscalEngine {
  private static sequenceCounter = 1;

  /**
   * Determina el tipo de comprobante según normativa fiscal argentina (ARCA / ex-AFIP):
   * - Emisor Monotributo -> Siempre FACTURA_C
   * - Emisor Responsable Inscripto + Receptor Responsable Inscripto -> FACTURA_A
   * - Emisor Responsable Inscripto + Receptor Consumidor Final / Exento -> FACTURA_B
   */
  static determineInvoiceType(seller: TaxCategory, buyer: TaxCategory): InvoiceType {
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

  static issueInvoice(request: InvoiceRequest): ElectronicInvoice {
    const invoiceType = this.determineInvoiceType(
      request.seller.taxCategory,
      request.buyer.taxCategory
    );

    const vatRate = request.vatRatePercent ?? 21;
    let netAmountCents: Money;
    let vatAmountCents: Money;

    if (invoiceType === 'FACTURA_C') {
      netAmountCents = request.totalAmountCents;
      vatAmountCents = 0n;
    } else {
      // Cálculo de neto e IVA
      netAmountCents = (request.totalAmountCents * 100n) / BigInt(100 + vatRate);
      vatAmountCents = request.totalAmountCents - netAmountCents;
    }

    // Generar CAE simulado válido (14 dígitos numéricos) y fecha de vencimiento a 10 días
    const cae = `74${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const expDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const invoice: ElectronicInvoice = {
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
