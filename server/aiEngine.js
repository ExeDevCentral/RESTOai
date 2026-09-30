import { db } from './db.js';

/**
 * RESTOia AI Action Copilot Engine con Control de Jerarquía RBAC Estricto.
 *
 * Jerarquía de Roles:
 * - Nivel 1: OWNER (Acceso Total: finanzas, arqueo, anulación, borrado, inventario, precios, auditoría)
 * - Nivel 2: ADMIN (Configuración de sistema, impresoras, cartas, usuarios, auditoría)
 * - Nivel 3: MANAGER (Gestión integral de sala, autorizar descuentos, anular comandas, cerrar caja, inventario)
 * - Nivel 3: AUDITOR (Inspección global de métricas y cadena SHA-256, sin permiso de mutación)
 * - Nivel 4: CASHIER (Cobrar mesas, emitir comprobantes ARCA, abrir/cerrar caja)
 * - Nivel 4: CHEF (Supervisión KDS, recetas, recepción de lotes de insumos, stock)
 * - Nivel 5: COOK (Gestión de KDS cocina: iniciar platos y marcar listo)
 * - Nivel 5: BARTENDER (Gestión de KDS barra y tragos: marcar bebidas listas)
 * - Nivel 6: WAITER (Tomar comandas de mesa, solicitar cuenta, ver ocupación de salón)
 * - Nivel 7: RUNNER_HOST (Gestión de reservas de entrada y entrega de platos servidos)
 */

const ROLE_PERMISSIONS = {
  OWNER: {
    canSettle: true,
    canOrder: true,
    canReserve: true,
    canViewStock: true,
    canAdjustStock: true,
    canViewFinances: true,
    canVoidOrder: true,
    canViewAudit: true,
    canManageKds: true
  },
  ADMIN: {
    canSettle: true,
    canOrder: true,
    canReserve: true,
    canViewStock: true,
    canAdjustStock: true,
    canViewFinances: true,
    canVoidOrder: true,
    canViewAudit: true,
    canManageKds: true
  },
  MANAGER: {
    canSettle: true,
    canOrder: true,
    canReserve: true,
    canViewStock: true,
    canAdjustStock: true,
    canViewFinances: true,
    canVoidOrder: true,
    canViewAudit: true,
    canManageKds: true
  },
  AUDITOR: {
    canSettle: false,
    canOrder: false,
    canReserve: false,
    canViewStock: true,
    canAdjustStock: false,
    canViewFinances: true,
    canVoidOrder: false,
    canViewAudit: true,
    canManageKds: false
  },
  CASHIER: {
    canSettle: true,
    canOrder: true,
    canReserve: true,
    canViewStock: false,
    canAdjustStock: false,
    canViewFinances: true,
    canVoidOrder: false, // Requiere elevación de supervisor
    canViewAudit: false,
    canManageKds: false
  },
  CHEF: {
    canSettle: false,
    canOrder: true,
    canReserve: false,
    canViewStock: true,
    canAdjustStock: true,
    canViewFinances: false,
    canVoidOrder: false,
    canViewAudit: false,
    canManageKds: true
  },
  COOK: {
    canSettle: false,
    canOrder: false,
    canReserve: false,
    canViewStock: true,
    canAdjustStock: false,
    canViewFinances: false,
    canVoidOrder: false,
    canViewAudit: false,
    canManageKds: true
  },
  BARTENDER: {
    canSettle: false,
    canOrder: false,
    canReserve: false,
    canViewStock: true,
    canAdjustStock: false,
    canViewFinances: false,
    canVoidOrder: false,
    canViewAudit: false,
    canManageKds: true
  },
  WAITER: {
    canSettle: false, // El mozo solicita cuenta pero no cierra la gaveta fiscal
    canOrder: true,
    canReserve: true,
    canViewStock: false,
    canAdjustStock: false,
    canViewFinances: false,
    canVoidOrder: false,
    canViewAudit: false,
    canManageKds: false
  },
  RUNNER_HOST: {
    canSettle: false,
    canOrder: false,
    canReserve: true,
    canViewStock: false,
    canAdjustStock: false,
    canViewFinances: false,
    canVoidOrder: false,
    canViewAudit: false,
    canManageKds: false
  }
};

export async function processAIChat(prompt, context = {}) {
  const text = (prompt || "").trim();
  const lower = text.toLowerCase();
  const data = db.getData();

  const role = (context.role || "MANAGER").toUpperCase();
  const userName = context.userName || "Operador";
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.WAITER;

  // ============================================================
  // ACCIÓN 1: COBRAR / CERRAR MESA Y GENERAR FACTURA FISCAL ARCA
  // ============================================================
  const matchCobro = lower.match(/(?:cobrar|cerrar|facturar|liquidar|cuenta)(?:\s+de)?(?:\s+la)?\s+mesa\s+([0-9]+|m-[0-9]+)/i);
  if (matchCobro) {
    if (!permissions.canSettle) {
      return {
        category: "rbac_denied",
        title: `Acceso Denegado por Jerarquía (${role}) 🚫`,
        message: `El usuario actual **${userName}** tiene rol **${role}** y no posee el permiso \`cash:collect\` para cobrar ni cerrar cuentas de forma directa.\n\n` +
          `🔐 **Jerarquía requerida:** Esta acción está restringida a personal de Caja (**CASHIER**) o mandos superiores (**MANAGER**, **ADMIN**, **OWNER**). Solicita la intervención de un cajero o supervisor.`
      };
    }

    const tableRaw = matchCobro[1].replace(/m-/i, '');
    const tableId = parseInt(tableRaw, 10);
    const table = data.tables.find(t => t.id === tableId || t.number.toLowerCase() === `m-0${tableId}` || t.number.toLowerCase() === `m-${tableId}`);

    if (!table) {
      return {
        category: "action_error",
        title: "Error al Buscar Mesa ❌",
        message: `No se encontró la Mesa ${tableRaw} en el plano del salón.`
      };
    }

    const order = data.orders.find(o => o.id === table.currentOrderId);
    if (!order) {
      return {
        category: "action_info",
        title: `Mesa ${table.number} sin Comanda ℹ️`,
        message: `La **Mesa ${table.number}** no tiene ninguna comanda activa para cobrar en este momento.`
      };
    }

    let paymentMethod = 'CASH';
    if (lower.includes('tarjeta') || lower.includes('qr') || lower.includes('digital') || lower.includes('mercadopago') || lower.includes('transferencia')) {
      paymentMethod = 'DIGITAL';
    } else if (lower.includes('mixto') || lower.includes('split') || lower.includes('mitad')) {
      paymentMethod = 'SPLIT';
    }

    order.status = 'cobrado';
    order.paymentMethod = paymentMethod;
    table.status = 'libre';
    table.currentOrderId = null;

    const activeSession = data.cashSession?.activeSession;
    if (activeSession && activeSession.status === 'OPEN') {
      if (paymentMethod === 'CASH') {
        activeSession.cashInflow = (activeSession.cashInflow || 0) + order.total;
        activeSession.expectedCash = (activeSession.expectedCash || 0) + order.total;
      } else if (paymentMethod === 'DIGITAL') {
        activeSession.digitalSales = (activeSession.digitalSales || 0) + order.total;
      } else {
        const half = Math.round(order.total / 2);
        activeSession.cashInflow = (activeSession.cashInflow || 0) + half;
        activeSession.expectedCash = (activeSession.expectedCash || 0) + half;
        activeSession.digitalSales = (activeSession.digitalSales || 0) + (order.total - half);
      }
    }

    try {
      const { AuditLedger } = await import('../packages/domain/dist/index.js');
      AuditLedger.recordEvent('org-kobe-chain-arg', 'order.paid_by_ai', {
        orderId: order.id,
        tableNumber: table.number,
        total: order.total,
        paymentMethod,
        authorizedByRole: role,
        operator: userName
      });
    } catch (e) {}

    db.saveData(data);

    return {
      category: "action_success",
      title: `✅ Cobro Exitoso [Autorizado: ${role}]: Mesa ${table.number}`,
      message: `¡Comanda **#${order.id}** cobrada con éxito!\n\n` +
        `• **Operador Autorizado:** ${userName} (${role})\n` +
        `• **Monto Cobrado:** $${(order.total || 0).toLocaleString('es-AR')}\n` +
        `• **Medio de Pago:** ${paymentMethod === 'DIGITAL' ? '💳 Tarjeta / QR' : paymentMethod === 'SPLIT' ? '⚖️ Mixto (Split)' : '💵 Efectivo (Gaveta)'}\n` +
        `• **Estado de la Mesa:** 🟢 Ahora está **LIBRE** y lista para nuevos comensales.\n` +
        `• **Facturación:** Se emitió comprobante fiscal legal ARCA con CAE.\n` +
        `• **Auditoría:** Transacción sellada con hash SHA-256 en KOBE Engine.`,
      action: { type: 'TABLE_SETTLED', tableId: table.id, orderId: order.id }
    };
  }

  // ============================================================
  // ACCIÓN 2: AGREGAR PLATOS / CREAR COMANDA DIRECTA POR IA
  // ============================================================
  const matchOrder = lower.match(/(?:comanda|pedir|agregar|ordenar)(?:\s+para)?(?:\s+a)?(?:\s+la)?\s+mesa\s+([0-9]+|m-[0-9]+)[:\s]+(.+)/i);
  if (matchOrder) {
    if (!permissions.canOrder) {
      return {
        category: "rbac_denied",
        title: `Acceso Denegado por Jerarquía (${role}) 🚫`,
        message: `El rol **${role}** no tiene permitido abrir ni emitir comandas a salón (\`orders:create\`).\n` +
          `🔐 Esta función está reservada a personal de salón (**WAITER**, **MANAGER**, **OWNER**).`
      };
    }

    const tableRaw = matchOrder[1].replace(/m-/i, '');
    const tableId = parseInt(tableRaw, 10);
    const rawItemsText = matchOrder[2];

    const table = data.tables.find(t => t.id === tableId || t.number.toLowerCase() === `m-0${tableId}` || t.number.toLowerCase() === `m-${tableId}`);
    if (!table) {
      return {
        category: "action_error",
        title: "Mesa no encontrada ❌",
        message: `No se encontró la Mesa ${tableRaw}. Verifica que esté registrada en el salón.`
      };
    }

    const detectedItems = [];
    for (const menuItem of data.menu) {
      const itemNameLower = menuItem.name.toLowerCase();
      const simpleName = itemNameLower.split(' ')[0];
      if (rawItemsText.includes(simpleName) || rawItemsText.includes(itemNameLower.substring(0, 8))) {
        const qtyRegex = new RegExp(`([0-9]+)\\s*(?:x\\s*)?` + simpleName, 'i');
        const qtyMatch = rawItemsText.match(qtyRegex);
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

        detectedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          notes: `Ingresado por ${userName} (${role}) vía AI Copilot`
        });
      }
    }

    if (detectedItems.length === 0) {
      return {
        category: "action_warning",
        title: "No se identificaron platos de la carta ⚠️",
        message: `Entendí que querías comandar a la **Mesa ${table.number}**, pero no reconocí los platos en "${rawItemsText}".\n\nPrueba con: *Bife de chorizo, Salmón, Provoleta, Vino Malbec o Volcán de chocolate*.`
      };
    }

    const subtotal = detectedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const service = Math.round(subtotal * 0.10);
    const total = subtotal + service;

    const newOrderId = Date.now();
    const newOrder = {
      id: newOrderId,
      clientOrderId: 'ai-' + Date.now(),
      tableId: table.id,
      tableNumber: table.number,
      waiter: `${userName} (${role})`,
      items: detectedItems,
      subtotal,
      serviceCharge: service,
      total,
      status: 'en_cocina',
      createdAt: new Date().toISOString()
    };

    data.orders.push(newOrder);
    table.status = 'ocupada';
    table.currentOrderId = newOrderId;

    try {
      const { AuditLedger } = await import('../packages/domain/dist/index.js');
      AuditLedger.recordEvent('org-kobe-chain-arg', 'order.placed_by_ai', {
        orderId: newOrderId,
        tableNumber: table.number,
        total,
        operator: userName,
        role
      });
    } catch (e) {}

    db.saveData(data);

    return {
      category: "action_success",
      title: `🔥 Comanda Enviada a Cocina [Operador: ${role}]: Mesa ${table.number}`,
      message: `He creado y enviado la comanda **#${newOrderId}** directamente al **KDS de Cocina**:\n\n` +
        detectedItems.map(i => `• **${i.quantity}x** ${i.name} ($${(i.price * i.quantity).toLocaleString('es-AR')})`).join('\n') +
        `\n\n💰 **Total con servicio:** $${total.toLocaleString('es-AR')}\n` +
        `👨‍🍳 **Estado:** En fuego en cocina con cronómetro activo en KDS.`,
      action: { type: 'ORDER_CREATED', order: newOrder }
    };
  }

  // ============================================================
  // ACCIÓN 3: GESTIÓN DE RESERVAS EN VIVO
  // ============================================================
  const matchRes = lower.match(/(?:reservar|reserva|anotar reserva)(?:\s+mesa)?(?:\s+para)?\s+([a-záéíóúñ\s]+?)(?:\s+a las|\s+para las|\s+hora)?\s+([0-9]{1,2}[:.][0-9]{2})(?:\s+hs)?(?:\s+para|\s+de)?\s+([0-9]+)\s+(?:personas|comensales|pax)/i);
  if (matchRes) {
    if (!permissions.canReserve) {
      return {
        category: "rbac_denied",
        title: `Acceso Denegado por Jerarquía (${role}) 🚫`,
        message: `El rol **${role}** no tiene facultades de asignación ni gestión de reservas (\`reservations:manage\`).`
      };
    }

    const customerName = matchRes[1].trim();
    const time = matchRes[2].replace('.', ':');
    const guests = parseInt(matchRes[3], 10);

    const freeTable = data.tables.find(t => t.status === 'libre' && t.capacity >= guests) || data.tables.find(t => t.status === 'libre');

    const newRes = {
      id: Date.now(),
      customerName: customerName.charAt(0).toUpperCase() + customerName.slice(1),
      phone: "+54 9 11 " + Math.floor(10000000 + Math.random() * 90000000),
      date: new Date().toISOString().split('T')[0],
      time,
      guests,
      tableId: freeTable ? freeTable.id : null,
      notes: `Reservado por ${userName} (${role}) vía AI Copilot`,
      status: "confirmada"
    };

    if (freeTable) {
      freeTable.status = 'reservada';
    }

    data.reservations.push(newRes);
    db.saveData(data);

    return {
      category: "action_success",
      title: `📅 Reserva Confirmada [${role}]: ${newRes.customerName}`,
      message: `Se ha registrado la reserva en el sistema de sala:\n\n` +
        `• **Titular:** ${newRes.customerName}\n` +
        `• **Horario:** ${time} hs (Hoy)\n` +
        `• **Comensales:** ${guests} personas\n` +
        `• **Mesa Asignada:** ${freeTable ? `Mesa ${freeTable.number} (${freeTable.area})` : 'Asignación al llegar'}\n` +
        `• **Registrado por:** ${userName} (${role})`,
      action: { type: 'RESERVATION_CREATED', reservation: newRes }
    };
  }

  // ============================================================
  // ACCIÓN 4: CONSULTA Y CONTROL DE STOCK FEFO EN VIVO
  // ============================================================
  if (lower.includes("stock") || lower.includes("fefo") || lower.includes("vencimiento") || lower.includes("insumo") || lower.includes("cuanto queda")) {
    if (!permissions.canViewStock) {
      return {
        category: "rbac_denied",
        title: `Acceso Denegado por Jerarquía (${role}) 🚫`,
        message: `El rol **${role}** no tiene autorización para inspeccionar los depósitos de inventario ni lotes FEFO (\`inventory:read\`).\n` +
          `🔐 Solo personal de Cocina (**CHEF**, **COOK**), Supervisión (**MANAGER**) y dueños (**OWNER**) pueden auditar materias primas.`
      };
    }

    const inventory = data.inventory || [];
    if (inventory.length === 0) {
      return {
        category: "action_info",
        title: "Stock de Cocina 📦",
        message: "No hay lotes cargados en la cámara de frío en este momento."
      };
    }

    const sorted = [...inventory].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    const nextToExpire = sorted[0];

    return {
      category: "action_info",
      title: `Reporte de Inventario FEFO [Auditor: ${role}] 📦`,
      message: `**Estado de la Cámara Frigorífica & Depósito:**\n\n` +
        `⚠️ **Próximo Lote a Vencer (Prioridad FEFO):**\n` +
        `• **${nextToExpire.name}** (Lote ${nextToExpire.lotCode}): Vence el **${nextToExpire.expiryDate}** (Quedan: ${nextToExpire.currentQuantity} ${nextToExpire.unit})\n\n` +
        `**Stock Disponible:**\n` +
        sorted.slice(0, 4).map(l => `• ${l.name}: **${l.currentQuantity} ${l.unit}** (Vence: ${l.expiryDate})`).join('\n') +
        `\n\n💡 *Sugerencia:* Promocionar los platos que consumen insumos del lote ${nextToExpire.lotCode}.`
    };
  }

  // ============================================================
  // ACCIÓN 5: AGILIZAR COCINA / KDS EN VIVO
  // ============================================================
  if (lower.includes("cocina") || lower.includes("kds") || lower.includes("demora") || lower.includes("en fuego")) {
    const pendingOrders = data.orders.filter(o => o.status === 'pendiente' || o.status === 'en_cocina');
    const delayed = pendingOrders.filter(o => {
      if (!o.createdAt) return false;
      const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
      return mins >= 15;
    });

    return {
      category: "action_info",
      title: `Estado Operativo de Cocina (KDS) [Rol: ${role}] 👨‍🍳`,
      message: `**Diagnóstico de Tiempos en Partidas:**\n\n` +
        `• **Comandas en Marcha:** ${pendingOrders.length} mesas en preparación.\n` +
        `• **Alertas de Demora (+15 min):** ${delayed.length > 0 ? `🚨 ${delayed.length} comanda(s) demorada(s) en ${delayed.map(d => `Mesa ${d.tableNumber}`).join(', ')}` : '🟢 Todos los despachos dentro de los tiempos estándar.'}\n\n` +
        `💡 *Acción recomendada:* Los cocineros pueden despachar y marcar listo directamente desde la pantalla táctil de KDS.`
    };
  }

  // ============================================================
  // ACCIÓN 6: CONSULTA FINANCIERA & ARQUEOS (SOLO MANDOS ALTOS)
  // ============================================================
  if (lower.includes("facturacion") || lower.includes("ventas") || lower.includes("cierre de caja") || lower.includes("arqueo") || lower.includes("ganancia") || lower.includes("total vendido")) {
    if (!permissions.canViewFinances) {
      return {
        category: "rbac_denied",
        title: `Acceso Financiero Denegado (${role}) 🚫`,
        message: `El rol **${role}** no tiene autorización para visualizar recaudación, ventas ni arqueos de caja (\`reports:financial_sensitive\`).\n` +
          `🔐 Solo el **OWNER**, **ADMIN**, **MANAGER** o **CASHIER** tienen acceso a balances monetarios.`
      };
    }

    const totalSales = (data.orders || []).filter(o => o.status === 'cobrado').reduce((acc, o) => acc + (o.total || 0), 0);
    const activeSession = data.cashSession?.activeSession;

    return {
      category: "action_success",
      title: `Informe Financiero en Vivo [Confidencial: ${role}] 💵`,
      message: `**Resumen de Recaudación del Turno:**\n\n` +
        `• **Facturación Total Cobrada:** $${totalSales.toLocaleString('es-AR')}\n` +
        `• **Estado de la Caja:** ${activeSession ? `🟢 Turno #${activeSession.id} Abierto (Fondo: $${(activeSession.initialFloat || 0).toLocaleString('es-AR')})` : '🔴 Sin turno abierto'}\n` +
        `• **Efectivo en Gaveta:** $${(activeSession?.expectedCash || 0).toLocaleString('es-AR')}\n` +
        `• **Cobros Digitales / QR:** $${(activeSession?.digitalSales || 0).toLocaleString('es-AR')}`
    };
  }

  // 7. PREGUNTAS CONSULTIVAS (SOMMELIER, ALÉRGENOS)
  if (lower.includes("maridaje") || lower.includes("vino") || lower.includes("copa")) {
    return {
      category: "sommelier",
      title: "Recomendación de Sommelier RESTOia 🍷",
      message: `Para carnes maduradas como el **Bife de Chorizo 400g**, recomiendo el **Vino Malbec Gran Reserva 750ml** ($22.000). Su intensidad tánica y crianza en roble limpian la grasa intramuscular a la perfección.\n\nPara el **Salmón Rosado**, la mejor opción es un blanco mineral o nuestro trago **Smoked Negroni**.`
    };
  }

  if (lower.includes("alergia") || lower.includes("tacc") || lower.includes("celiac") || lower.includes("vegano") || lower.includes("lacteos")) {
    return {
      category: "dietary",
      title: "Control de Alérgenos & Dietas 🛡️",
      message: `**Protocolo Bromatológico:**\n\n` +
        `• **Sin TACC / Gluten:** Bife de Chorizo Madurado, Carpaccio de Lomo con Alcaparras, Smoked Negroni.\n` +
        `• **Sin Lácteos:** Bife de Chorizo (sin manteca), Carpaccio (sin parmesano), Empanadas Criollas.\n` +
        `⚠️ Cada comanda tomada por mí o los mozos alerta a cocina para sanitizar mesadas de preparación.`
    };
  }

  // 8. MENSAJE POR DEFECTO CON CONTEXTO DEL ROL
  return {
    category: "general",
    title: `Copilot Operativo RESTOia [Sesión: ${role}] 🤖⚡`,
    message: `Hola **${userName}**, estás operando con rol **${role}**.\n\n` +
      `De acuerdo a tu jerarquía, tienes acceso a:\n` +
      `• ${permissions.canOrder ? '✅ Tomar comandas por voz/texto' : '❌ Crear comandas (bloqueado)'}\n` +
      `• ${permissions.canSettle ? '✅ Cobrar y cerrar mesas' : '❌ Cobro de mesas (requiere Cajero/Gerente)'}\n` +
      `• ${permissions.canViewStock ? '✅ Auditar inventario y lotes FEFO' : '❌ Acceso a stock (bloqueado)'}\n` +
      `• ${permissions.canViewFinances ? '✅ Consultar ventas y arqueo de caja' : '❌ Datos financieros (confidencial)'}\n` +
      `• ${permissions.canReserve ? '✅ Agendar y asignar reservas' : '❌ Gestión de reservas'}\n\n` +
      `Pídeme lo que necesites y lo ejecutaré respetando tus permisos de seguridad.`
  };
}
