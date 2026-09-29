import { ModernReceiptData } from './printTypes.js';
export declare class ReceiptBuilder {
    /**
     * Genera el ID corto de verificación de 8 caracteres tipo 7F3A-91C2
     */
    static generateVerificationCode(hashOrId: string): string;
    /**
     * Construye el DTO unificado del ticket moderno a partir de la orden e invoice
     */
    static buildReceipt(params: {
        order: {
            id: string | number;
            tableNumber: string | number;
            waiter?: string;
            items: Array<{
                name: string;
                quantity: number;
                price?: number;
                unitPriceCents?: bigint;
                notes?: string;
            }>;
            total?: number;
            totalAmountCents?: bigint;
        };
        orderHash?: string;
        invoice?: {
            invoiceType: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
            pointOfSale: number;
            invoiceNumber: number;
            cae: string;
            caeExpirationDate: string;
            netAmountCents: bigint;
            vatAmountCents: bigint;
        };
        isReprint?: boolean;
        reprintCount?: number;
        paymentMethod?: string;
    }): ModernReceiptData;
}
//# sourceMappingURL=receiptBuilder.d.ts.map