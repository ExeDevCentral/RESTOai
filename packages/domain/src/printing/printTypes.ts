import { z } from 'zod';
import { Money } from '../primitives.js';

export const PrinterKindSchema = z.enum([
  'THERMAL_ESCPOS',
  'THERMAL_STAR',
  'LASER_A4',
  'LABEL_ZPL',
  'FISCAL'
]);
export type PrinterKind = z.infer<typeof PrinterKindSchema>;

export const PrintTransportSchema = z.enum([
  'AGENT',
  'TCP9100',
  'CLOUDPRNT',
  'WEBUSB',
  'WEBSERIAL',
  'BROWSER'
]);
export type PrintTransport = z.infer<typeof PrintTransportSchema>;

export const DocTypeSchema = z.enum([
  'KITCHEN_TICKET',
  'BAR_TICKET',
  'PRE_BILL',
  'RECEIPT',
  'INVOICE',
  'PAYROLL_SLIP',
  'SUPPLIER_ORDER',
  'SUPPLIER_PAYMENT',
  'CASH_CLOSE'
]);
export type DocType = z.infer<typeof DocTypeSchema>;

export const PrintJobStatusSchema = z.enum([
  'QUEUED',
  'SENDING',
  'PRINTED',
  'FAILED',
  'CANCELLED'
]);
export type PrintJobStatus = z.infer<typeof PrintJobStatusSchema>;

export const PrintFormatSchema = z.enum(['ESCPOS', 'PDF', 'ZPL', 'HTML']);
export type PrintFormat = z.infer<typeof PrintFormatSchema>;

export interface PrinterDefinition {
  id: string;
  tenantId: string;
  locationId: string;
  name: string;
  kind: PrinterKind;
  transport: PrintTransport;
  address: string; // ej: 192.168.1.200:9100 o agent-device-01
  paperWidthMm: number; // 58 u 80
  charset: string; // 'CP858' | 'CP1252'
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
  station?: string; // 'cocina', 'barra', 'caja', 'administracion'
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
  payload: string; // base64 bytes ESC/POS o raw text / HTML / JSON
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
  orderShortHash: string; // primeros 8 chars del hash SHA-256 (ej: 7F3A-91C2)
  tableNumber: string;
  waiterName: string;
  issuedAt: string; // ISO
  isReprint: boolean;
  reprintCount: number;
  business: {
    name: string;
    fantasyName: string;
    address: string;
    cuit: string;
    taxCategory: string; // 'IVA Responsable Inscripto'
    iibb?: string;
    pointOfSale: number;
  };
  invoice?: {
    type: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'PRE_BILL';
    number: string; // ej: 0004-00012345
    cae?: string;
    caeExpirationDate?: string;
    vatAmountCents?: Money;
    netAmountCents?: Money;
  };
  items: ReceiptItem[];
  subtotalCents: Money;
  tipSuggestedCents: Money;
  totalCents: Money;
  paymentMethod: string; // 'Efectivo', 'Mercado Pago (QR)', 'Split'
  verificationUrl: string; // URL pública firmada para verificar online
  fiscalQrUrl?: string; // Standard ARCA/AFIP QR link
  footerMessage?: string; // ej: 'Gracias por elegirnos ♥ @kobe.rosario'
}
