import { ModernReceiptData } from './printTypes.js';

export class HtmlReceiptRenderer {
  private static formatMoney(cents: bigint): string {
    const units = Number(cents) / 100;
    return units.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Genera el HTML responsivo y estilizado para ticket térmico de 80mm o visualización digital/QR
   */
  static renderReceiptHtml(receipt: ModernReceiptData): string {
    const isReprintBadge = receipt.isReprint ? `
      <div style="background: #ef4444; color: #fff; text-align: center; font-size: 11px; font-weight: bold; padding: 4px; border-radius: 4px; margin-bottom: 8px; text-transform: uppercase;">
        *** COPIA / REIMPRESIÓN (N° ${receipt.reprintCount}) ***
      </div>
    ` : '';

    const invoiceTitle = receipt.invoice?.type === 'PRE_BILL'
      ? 'PRECUENTA - CONTROL DE MESA'
      : `${receipt.invoice?.type.replace('_', ' ')} N° ${receipt.invoice?.number}`;

    const dateStr = new Date(receipt.issuedAt).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta ${receipt.orderShortHash} - KOBE</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 12px;
      color: #000;
      background: #fff;
      font-size: 13px;
      line-height: 1.25;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 2px solid #000; margin: 8px 0; }
    .flex { display: flex; justify-content: space-between; }
    .total-box {
      font-size: 18px;
      font-weight: 900;
      padding: 6px 0;
      margin: 6px 0;
      text-align: center;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 12px 0 6px 0;
    }
    .qr-placeholder {
      width: 110px;
      height: 110px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-family: sans-serif;
      text-align: center;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  ${isReprintBadge}

  <div class="text-center">
    <div style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">${receipt.business.fantasyName}</div>
    <div style="font-size: 11px;">${receipt.business.name}</div>
    <div style="font-size: 11px;">${receipt.business.address}</div>
    <div style="font-size: 11px;">CUIT: ${receipt.business.cuit} · ${receipt.business.taxCategory}</div>
  </div>

  <div class="double-divider"></div>

  <div class="bold">${invoiceTitle}</div>
  <div class="flex" style="font-size: 11px;">
    <span>${dateStr}</span>
    <span>Mesa ${receipt.tableNumber} · Mozo: ${receipt.waiterName}</span>
  </div>

  <div class="divider"></div>

  <div class="flex bold" style="font-size: 11px; margin-bottom: 4px;">
    <span>CANT DETALLE</span>
    <span>IMPORTE</span>
  </div>

  ${receipt.items.map(i => `
    <div class="flex" style="margin-bottom: 3px;">
      <span>${i.quantity}x ${i.name}</span>
      <span>$ ${this.formatMoney(i.subtotalCents)}</span>
    </div>
    ${i.notes ? `<div style="font-size: 10px; color: #555; padding-left: 12px;">+ ${i.notes}</div>` : ''}
  `).join('')}

  <div class="divider"></div>

  <div class="flex">
    <span>Subtotal</span>
    <span>$ ${this.formatMoney(receipt.subtotalCents)}</span>
  </div>
  ${receipt.tipSuggestedCents > 0n ? `
    <div class="flex" style="font-size: 11px; color: #333;">
      <span>Propina sugerida 10%</span>
      <span>$ ${this.formatMoney(receipt.tipSuggestedCents)}</span>
    </div>
  ` : ''}

  <div class="total-box">
    TOTAL: $ ${this.formatMoney(receipt.totalCents)}
  </div>

  <div class="flex" style="font-size: 11px;">
    <span>Medio de Pago:</span>
    <span class="bold">${receipt.paymentMethod}</span>
  </div>

  ${receipt.invoice?.vatAmountCents ? `
    <div class="flex" style="font-size: 11px;">
      <span>IVA discriminado (21%):</span>
      <span>$ ${this.formatMoney(receipt.invoice.vatAmountCents)}</span>
    </div>
  ` : ''}

  ${receipt.invoice?.cae ? `
    <div class="double-divider"></div>
    <div style="font-size: 11px;">
      <div><strong>CAE:</strong> ${receipt.invoice.cae}</div>
      <div><strong>Vto CAE:</strong> ${receipt.invoice.caeExpirationDate}</div>
    </div>
  ` : ''}

  <div class="divider"></div>

  <div class="qr-container">
    <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">Verificá tu boleta digital:</div>
    <div class="qr-placeholder">
      QR DE VERIFICACIÓN<br>${receipt.orderShortHash}
    </div>
    <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">VERIF: ${receipt.orderShortHash}</div>
    <div style="font-size: 9px; color: #666;">${receipt.verificationUrl}</div>
  </div>

  <div class="text-center" style="font-size: 11px; margin-top: 10px;">
    ${receipt.footerMessage || 'Gracias por elegirnos ♥ @kobe.rosario'}
  </div>
</body>
</html>
    `.trim();
  }
}
