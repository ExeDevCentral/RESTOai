import { ModernReceiptData } from './printTypes.js';
export interface EscPosOptions {
    columns?: 32 | 42 | 48;
    charset?: 'CP858' | 'CP1252';
    feedLines?: number;
    cutPartial?: boolean;
}
export declare class EscPosRenderer {
    static readonly ESC = 27;
    static readonly GS = 29;
    static readonly CMD_INIT: Buffer<ArrayBuffer>;
    static readonly CMD_CODEPAGE_CP858: Buffer<ArrayBuffer>;
    static readonly CMD_ALIGN_LEFT: Buffer<ArrayBuffer>;
    static readonly CMD_ALIGN_CENTER: Buffer<ArrayBuffer>;
    static readonly CMD_ALIGN_RIGHT: Buffer<ArrayBuffer>;
    static readonly CMD_BOLD_ON: Buffer<ArrayBuffer>;
    static readonly CMD_BOLD_OFF: Buffer<ArrayBuffer>;
    static readonly CMD_DOUBLE_SIZE_ON: Buffer<ArrayBuffer>;
    static readonly CMD_NORMAL_SIZE: Buffer<ArrayBuffer>;
    static readonly CMD_DRAWER_KICK: Buffer<ArrayBuffer>;
    static readonly CMD_CUT_PARTIAL: Buffer<ArrayBuffer>;
    private static formatMoney;
    private static padLine;
    /**
     * Genera los bytes ESC/POS crudos para imprimir la boleta moderna
     */
    static renderReceipt(receipt: ModernReceiptData, options?: EscPosOptions): Buffer;
    /**
     * Genera comanda de cocina (sin precios, mesa grande, notas destacadas)
     */
    static renderKitchenTicket(params: {
        station: string;
        orderId: string | number;
        tableNumber: string | number;
        waiter: string;
        items: Array<{
            name: string;
            quantity: number;
            notes?: string;
        }>;
        timestamp?: string;
        columns?: 32 | 42 | 48;
    }): Buffer;
}
//# sourceMappingURL=escPosRenderer.d.ts.map