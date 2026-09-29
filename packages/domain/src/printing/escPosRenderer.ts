import { ModernReceiptData } from './printTypes.js';

export interface EscPosOptions {
  columns?: 32 | 42 | 48; // 32 para 58mm, 42/48 para 80mm
  charset?: 'CP858' | 'CP1252';
  feedLines?: number;
  cutPartial?: boolean;
}

export class EscPosRenderer {
  // Constantes de comandos ESC/POS estándar
  static readonly ESC = 0x1B;
  static readonly GS = 0x1D;

  static readonly CMD_INIT = Buffer.from([0x1B, 0x40]); // ESC @
  static readonly CMD_CODEPAGE_CP858 = Buffer.from([0x1B, 0x74, 19]); // ESC t 19
  static readonly CMD_ALIGN_LEFT = Buffer.from([0x1B, 0x61, 0]); // ESC a 0
  static readonly CMD_ALIGN_CENTER = Buffer.from([0x1B, 0x61, 1]); // ESC a 1
  static readonly CMD_ALIGN_RIGHT = Buffer.from([0x1B, 0x61, 2]); // ESC a 2
  static readonly CMD_BOLD_ON = Buffer.from([0x1B, 0x45, 1]); // ESC E 1
  static readonly CMD_BOLD_OFF = Buffer.from([0x1B, 0x45, 0]); // ESC E 0
  static readonly CMD_DOUBLE_SIZE_ON = Buffer.from([0x1D, 0x21, 0x11]); // GS ! 0x11 (Doble alto y ancho)
  static readonly CMD_NORMAL_SIZE = Buffer.from([0x1D, 0x21, 0x00]); // GS ! 0x00
  static readonly CMD_DRAWER_KICK = Buffer.from([0x1B, 0x70, 0, 25, 250]); // ESC p 0 25 250
  static readonly CMD_CUT_PARTIAL = Buffer.from([0x1D, 0x56, 66, 3]); // GS V 66 3

  private static formatMoney(cents: bigint): string {
    const units = Number(cents) / 100;
    return units.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private static padLine(left: string, right: string, width: number): string {
    const leftLen = left.length;
    const rightLen = right.length;
    if (leftLen + rightLen >= width) {
      const available = width - rightLen - 1;
      return left.slice(0, Math.max(0, available)) + ' ' + right;
    }
    const spaces = ' '.repeat(width - leftLen - rightLen);
    return left + spaces + right;
  }

  /**
   * Genera los bytes ESC/POS crudos para imprimir la boleta moderna
   */
  static renderReceipt(receipt: ModernReceiptData, options: EscPosOptions = {}): Buffer {
    const width = options.columns ?? 48;
    const chunks: Buffer[] = [];

    const push = (buf: Buffer) => chunks.push(buf);
    const pushText = (text: string) => chunks.push(Buffer.from(text + '\n', 'latin1'));

    // 1. Inicialización de impresora y codepage
    push(this.CMD_INIT);
    push(this.CMD_CODEPAGE_CP858);

    // 2. Encabezado centrado y marca de reimpresión si corresponde
    push(this.CMD_ALIGN_CENTER);
    if (receipt.isReprint) {
      push(this.CMD_BOLD_ON);
      pushText(`*** COPIA / REIMPRESION (N° ${receipt.reprintCount}) ***`);
      push(this.CMD_BOLD_OFF);
      pushText('');
    }

    push(this.CMD_BOLD_ON);
    pushText(receipt.business.fantasyName);
    push(this.CMD_BOLD_OFF);
    pushText(receipt.business.name);
    pushText(receipt.business.address);
    pushText(`CUIT: ${receipt.business.cuit} · ${receipt.business.taxCategory}`);
    pushText('='.repeat(width));

    // 3. Comprobante / Mesa / Mozo
    push(this.CMD_ALIGN_LEFT);
    const invoiceLabel = receipt.invoice?.type === 'PRE_BILL'
      ? 'PRECUENTA - CONTROL DE MESA'
      : `${receipt.invoice?.type.replace('_', ' ')} N° ${receipt.invoice?.number}`;

    push(this.CMD_BOLD_ON);
    pushText(invoiceLabel);
    push(this.CMD_BOLD_OFF);

    const dateStr = new Date(receipt.issuedAt).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    pushText(this.padLine(dateStr, `Mesa: ${receipt.tableNumber} · Mozo: ${receipt.waiterName}`, width));
    pushText('-'.repeat(width));

    // 4. Encabezado de columnas
    if (width >= 42) {
      pushText(this.padLine('CANT  DETALLE', 'IMPORTE', width));
    } else {
      pushText(this.padLine('CNT DETALLE', 'IMP', width));
    }
    pushText('-'.repeat(width));

    // 5. Ítems detallados
    for (const item of receipt.items) {
      const cantStr = String(item.quantity).padStart(2, ' ') + '  ';
      const priceStr = this.formatMoney(item.subtotalCents);
      const namePart = item.name;
      pushText(this.padLine(cantStr + namePart, priceStr, width));
      if (item.notes) {
        pushText(`      + ${item.notes}`);
      }
    }
    pushText('-'.repeat(width));

    // 6. Subtotales y Totales
    pushText(this.padLine('Subtotal', this.formatMoney(receipt.subtotalCents), width));
    if (receipt.tipSuggestedCents > 0n) {
      pushText(this.padLine('Propina sugerida 10%', this.formatMoney(receipt.tipSuggestedCents), width));
    }
    pushText('-'.repeat(width));

    // 7. TOTAL en Doble Alto y Ancho
    push(this.CMD_BOLD_ON);
    push(this.CMD_DOUBLE_SIZE_ON);
    const totalLine = `TOTAL: $ ${this.formatMoney(receipt.totalCents)}`;
    push(this.CMD_ALIGN_CENTER);
    pushText(totalLine);
    push(this.CMD_NORMAL_SIZE);
    push(this.CMD_BOLD_OFF);

    push(this.CMD_ALIGN_LEFT);
    pushText('-'.repeat(width));
    pushText(this.padLine('Forma de Pago:', receipt.paymentMethod, width));

    if (receipt.invoice && receipt.invoice.vatAmountCents) {
      pushText(this.padLine('IVA discriminado / contenido:', `$ ${this.formatMoney(receipt.invoice.vatAmountCents)}`, width));
    }
    pushText('='.repeat(width));

    // 8. Datos Fiscales ARCA (CAE)
    if (receipt.invoice?.cae) {
      push(this.CMD_ALIGN_LEFT);
      pushText(`CAE: ${receipt.invoice.cae}   Vto: ${receipt.invoice.caeExpirationDate}`);
      pushText('');
    }

    // 9. Verificación de Boleta Digital y Código Seguro
    push(this.CMD_ALIGN_CENTER);
    pushText('Verifica tu boleta digital en:');
    push(this.CMD_BOLD_ON);
    pushText(`VERIF: ${receipt.orderShortHash}`);
    push(this.CMD_BOLD_OFF);
    pushText(receipt.verificationUrl);

    // 10. Mensaje de Marca al Pie
    pushText('');
    pushText(receipt.footerMessage || 'Gracias por elegirnos');
    pushText('');

    // 11. Avance y corte
    push(Buffer.from([0x1B, 0x4A, 48])); // ESC J 48
    if (options.cutPartial !== false) {
      push(this.CMD_CUT_PARTIAL);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Genera comanda de cocina (sin precios, mesa grande, notas destacadas)
   */
  static renderKitchenTicket(params: {
    station: string;
    orderId: string | number;
    tableNumber: string | number;
    waiter: string;
    items: Array<{ name: string; quantity: number; notes?: string }>;
    timestamp?: string;
    columns?: 32 | 42 | 48;
  }): Buffer {
    const width = params.columns ?? 48;
    const chunks: Buffer[] = [];
    const push = (buf: Buffer) => chunks.push(buf);
    const pushText = (text: string) => chunks.push(Buffer.from(text + '\n', 'latin1'));

    push(this.CMD_INIT);
    push(this.CMD_CODEPAGE_CP858);
    push(this.CMD_ALIGN_CENTER);

    push(this.CMD_BOLD_ON);
    push(this.CMD_DOUBLE_SIZE_ON);
    pushText(`[ ${params.station.toUpperCase()} ]`);
    push(this.CMD_NORMAL_SIZE);

    push(this.CMD_DOUBLE_SIZE_ON);
    pushText(`MESA: ${params.tableNumber}`);
    push(this.CMD_NORMAL_SIZE);
    push(this.CMD_BOLD_OFF);

    push(this.CMD_ALIGN_LEFT);
    pushText(`Comanda #${params.orderId} · Mozo: ${params.waiter}`);
    pushText(`Hora: ${params.timestamp || new Date().toLocaleTimeString('es-AR')}`);
    pushText('='.repeat(width));

    push(this.CMD_BOLD_ON);
    for (const item of params.items) {
      push(this.CMD_DOUBLE_SIZE_ON);
      pushText(`${item.quantity}x ${item.name}`);
      push(this.CMD_NORMAL_SIZE);
      if (item.notes) {
        // En térmicas estándar los emojis degradan a texto limpio legible
        pushText(`  * NOTA: ${item.notes}`);
      }
      pushText('');
    }
    push(this.CMD_BOLD_OFF);

    pushText('='.repeat(width));
    push(Buffer.from([0x1B, 0x4A, 48]));
    push(this.CMD_CUT_PARTIAL);

    return Buffer.concat(chunks);
  }
}
