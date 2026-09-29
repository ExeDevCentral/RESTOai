import { z } from 'zod';
export const PrinterKindSchema = z.enum([
    'THERMAL_ESCPOS',
    'THERMAL_STAR',
    'LASER_A4',
    'LABEL_ZPL',
    'FISCAL'
]);
export const PrintTransportSchema = z.enum([
    'AGENT',
    'TCP9100',
    'CLOUDPRNT',
    'WEBUSB',
    'WEBSERIAL',
    'BROWSER'
]);
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
export const PrintJobStatusSchema = z.enum([
    'QUEUED',
    'SENDING',
    'PRINTED',
    'FAILED',
    'CANCELLED'
]);
export const PrintFormatSchema = z.enum(['ESCPOS', 'PDF', 'ZPL', 'HTML']);
//# sourceMappingURL=printTypes.js.map