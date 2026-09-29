import { z } from 'zod';
import { Money } from '../primitives.js';
export declare const PrinterKindSchema: z.ZodEnum<["THERMAL_ESCPOS", "THERMAL_STAR", "LASER_A4", "LABEL_ZPL", "FISCAL"]>;
export type PrinterKind = z.infer<typeof PrinterKindSchema>;
export declare const PrintTransportSchema: z.ZodEnum<["AGENT", "TCP9100", "CLOUDPRNT", "WEBUSB", "WEBSERIAL", "BROWSER"]>;
export type PrintTransport = z.infer<typeof PrintTransportSchema>;
export declare const DocTypeSchema: z.ZodEnum<["KITCHEN_TICKET", "BAR_TICKET", "PRE_BILL", "RECEIPT", "INVOICE", "PAYROLL_SLIP", "SUPPLIER_ORDER", "SUPPLIER_PAYMENT", "CASH_CLOSE"]>;
export type DocType = z.infer<typeof DocTypeSchema>;
export declare const PrintJobStatusSchema: z.ZodEnum<["QUEUED", "SENDING", "PRINTED", "FAILED", "CANCELLED"]>;
export type PrintJobStatus = z.infer<typeof PrintJobStatusSchema>;
export declare const PrintFormatSchema: z.ZodEnum<["ESCPOS", "PDF", "ZPL", "HTML"]>;
export type PrintFormat = z.infer<typeof PrintFormatSchema>;
export interface PrinterDefinition {
    id: string;
    tenantId: string;
    locationId: string;
    name: string;
    kind: PrinterKind;
    transport: PrintTransport;
    address: string;
    paperWidthMm: number;
    charset: string;
    cut: boolean;
    drawer: boolean;
    status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
    lastSeenAt?: string;
}
export interface PrintRoute {
    id: string;
    tenantId: string;
    locationId: string;
    docType: DocType;
    station?: string;
    printerId: string;
    copies: number;
    priority: number;
}
export interface PrintJob {
    id: string;
    tenantId: string;
    locationId: string;
    printerId: string;
    docType: DocType;
    format: PrintFormat;
    payload: string;
    copies: number;
    openDrawer: boolean;
    status: PrintJobStatus;
    attempts: number;
    maxAttempts: number;
    idempotencyKey: string;
    error?: string;
    createdAt: string;
    printedAt?: string;
}
export interface ReceiptItem {
    name: string;
    quantity: number;
    unitPriceCents: Money;
    subtotalCents: Money;
    notes?: string;
}
export interface ModernReceiptData {
    orderId: string;
    orderShortHash: string;
    tableNumber: string;
    waiterName: string;
    issuedAt: string;
    isReprint: boolean;
    reprintCount: number;
    business: {
        name: string;
        fantasyName: string;
        address: string;
        cuit: string;
        taxCategory: string;
        iibb?: string;
        pointOfSale: number;
    };
    invoice?: {
        type: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'PRE_BILL';
        number: string;
        cae?: string;
        caeExpirationDate?: string;
        vatAmountCents?: Money;
        netAmountCents?: Money;
    };
    items: ReceiptItem[];
    subtotalCents: Money;
    tipSuggestedCents: Money;
    totalCents: Money;
    paymentMethod: string;
    verificationUrl: string;
    fiscalQrUrl?: string;
    footerMessage?: string;
}
//# sourceMappingURL=printTypes.d.ts.map