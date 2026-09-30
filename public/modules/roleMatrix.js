// Role Matrix & RBAC Demo Engine Module

export const ROLE_DEFINITIONS = {
  OWNER: {
    level: 1,
    code: 'OWNER',
    name: 'Mariano Casares (Dueño)',
    avatar: '👑',
    label: 'Owner (Nivel 1)',
    device: 'Celular / Tablet Personal (Remoto o Local)',
    description: 'Acceso y soberanía total sobre la operación gastronómica, finanzas, aperturas de caja, auditoría criptográfica, fijación de precios y anulación libre de tickets sin supervisión.',
    allowedTabs: [
      'tab-pos', 'tab-kds', 'tab-menu', 'tab-inventory', 
      'tab-suppliers', 'tab-reservations', 'tab-copilot', 
      'tab-analytics', 'tab-cash', 'tab-printers', 'tab-kobe-engine'
    ],
    permissions: {
      createOrder: true,
      manageKds: true,
      settleFiscal: true,
      cashBlindAudit: true,
      fefoStock: true,
      cryptoAudit: true,
      voidWithoutPin: true,
      financialReports: true
    },
    voiceExamples: [
      '"¿Cuánto vendimos hoy y cuál es el arqueo de caja?"',
      '"Cobrar mesa 1 en efectivo"',
      '"Comanda mesa 4: 2 ojos de bife con papas"',
      '"Mostrar estado de la auditoría SHA-256"'
    ]
  },
  ADMIN: {
    level: 2,
    code: 'ADMIN',
    name: 'Admin Sistemas',
    avatar: '💻',
    label: 'Admin (Nivel 2)',
    device: 'PC Oficina / Terminal de Servidor',
    description: 'Configuración técnica de red Wi-Fi, impresoras térmicas ESC/POS, cartas de precios, gestión de empleados y llaves de acceso ARCA / AFIP.',
    allowedTabs: [
      'tab-pos', 'tab-kds', 'tab-menu', 'tab-inventory', 
      'tab-suppliers', 'tab-reservations', 'tab-copilot', 
      'tab-analytics', 'tab-cash', 'tab-printers', 'tab-kobe-engine'
    ],
    permissions: {
      createOrder: true,
      manageKds: true,
      settleFiscal: true,
      cashBlindAudit: true,
      fefoStock: true,
      cryptoAudit: true,
      voidWithoutPin: true,
      financialReports: true
    },
    voiceExamples: [
      '"Probar impresión en comandera de cocina"',
      '"Verificar estado de nodos en red Wi-Fi"',
      '"Auditar integridad de cadena criptográfica"'
    ]
  },
  MANAGER: {
    level: 3,
    code: 'MANAGER',
    name: 'Facundo M. (Gerente)',
    avatar: '👔',
    label: 'Manager (Nivel 3)',
    device: 'Tablet de Salón / PC Gerencial',
    description: 'Liderazgo operativo en turno. Autoriza descuentos y cancelaciones, supervisa demoras de comandas en KDS, realiza aperturas/cierres de caja y gestiona reservas.',
    allowedTabs: [
      'tab-pos', 'tab-kds', 'tab-menu', 'tab-inventory', 
      'tab-suppliers', 'tab-reservations', 'tab-copilot', 
      'tab-analytics', 'tab-cash', 'tab-printers', 'tab-kobe-engine'
    ],
    permissions: {
      createOrder: true,
      manageKds: true,
      settleFiscal: true,
      cashBlindAudit: true,
      fefoStock: true,
      cryptoAudit: true,
      voidWithoutPin: true,
      financialReports: true
    },
    voiceExamples: [
      '"¿Hay mesas con más de 15 minutos de demora en cocina?"',
      '"Cobrar mesa 3 con tarjeta de crédito"',
      '"Aplicar 15% de descuento en mesa 2"',
      '"Reservar mesa para 4 personas a las 21 horas"'
    ]
  },
  AUDITOR: {
    level: 3,
    code: 'AUDITOR',
    name: 'Dra. Beatriz Rossi',
    avatar: '🔍',
    label: 'Auditor (Nivel 3)',
    device: 'Laptop Contable / Auditoría Externa',
    description: 'Inspección de solo lectura sobre el libro contable de partida doble, comprobantes fiscales ARCA y verificación matemática de la cadena SHA-256 sin capacidad de mutación.',
    allowedTabs: [
      'tab-pos', 'tab-analytics', 'tab-cash', 'tab-kobe-engine'
    ],
    permissions: {
      createOrder: false,
      manageKds: false,
      settleFiscal: false,
      cashBlindAudit: true,
      fefoStock: true,
      cryptoAudit: true,
      voidWithoutPin: false,
      financialReports: true
    },
    voiceExamples: [
      '"Verificar integridad de la cadena SHA-256"',
      '"Reporte de ventas y facturación del día"',
      '"Inspeccionar asientos contables automáticos"'
    ]
  },
  CASHIER: {
    level: 4,
    code: 'CASHIER',
    name: 'Lucía Fernández',
    avatar: '💵',
    label: 'Cajero / Turno (Nivel 4)',
    device: 'Terminal Punto de Venta (POS) de Caja',
    description: 'Cobro de comandas de salón, emisión de tickets con CAE y código QR ARCA, arqueo ciego Z y gestión de retiros o ingresos en gaveta física.',
    allowedTabs: [
      'tab-pos', 'tab-menu', 'tab-reservations', 'tab-copilot', 'tab-cash', 'tab-printers'
    ],
    permissions: {
      createOrder: true,
      manageKds: false,
      settleFiscal: true,
      cashBlindAudit: true,
      fefoStock: false,
      cryptoAudit: false,
      voidWithoutPin: false, // Requiere PIN de supervisor (1234)
      financialReports: true
    },
    voiceExamples: [
      '"Cobrar mesa 1 en efectivo"',
      '"Cobrar mesa 5 pago mixto 5000 efectivo y resto QR"',
      '"Imprimir ticket fiscal de la mesa 2"',
      '"Registrar ingreso de cambio en caja de $10.000"'
    ]
  },
  CHEF: {
    level: 4,
    code: 'CHEF',
    name: 'Chef Damián R.',
    avatar: '👨‍🍳',
    label: 'Chef Ejecutivo (Nivel 4)',
    device: 'Tablet de Despacho de Cocina',
    description: 'Supervisión de comandas en preparación, control de partidas calientes/frías, recepción de lotes de insumos con control de temperatura y gestión FEFO.',
    allowedTabs: [
      'tab-kds', 'tab-menu', 'tab-inventory', 'tab-suppliers', 'tab-copilot'
    ],
    permissions: {
      createOrder: true,
      manageKds: true,
      settleFiscal: false,
      cashBlindAudit: false,
      fefoStock: true,
      cryptoAudit: false,
      voidWithoutPin: false,
      financialReports: false
    },
    voiceExamples: [
      '"¿Qué lotes vencen esta semana en la cámara de frío?"',
      '"Estado de comandas demoradas en cocina"',
      '"Imprimir rótulo de código de barras para bife de chorizo"'
    ]
  },
  COOK: {
    level: 5,
    code: 'COOK',
    name: 'Cocina Josper #1',
    avatar: '🔥',
    label: 'Cocinero (Nivel 5)',
    device: 'Pantalla KDS Táctil / TV Colgante',
    description: 'Visualización de platos asignados a la partida de fuegos, hornos o parrilla. Inicia preparaciones y marca platos listos para emplatar.',
    allowedTabs: [
      'tab-kds', 'tab-inventory'
    ],
    permissions: {
      createOrder: false,
      manageKds: true,
      settleFiscal: false,
      cashBlindAudit: false,
      fefoStock: true,
      cryptoAudit: false,
      voidWithoutPin: false,
      financialReports: false
    },
    voiceExamples: [
      '"Marcar listo mesa 2 bife de chorizo"',
      '"Consultar stock de salmón rosado"',
      '"¿Cuánto falta para las comandas en fuego?"'
    ]
  },
  BARTENDER: {
    level: 5,
    code: 'BARTENDER',
    name: 'Matias Barra',
    avatar: '🍸',
    label: 'Bartender (Nivel 5)',
    device: 'Tablet / Pantalla en Barra',
    description: 'Despacho ágil de coctelería, vinos, cervezas tiradas y cafetería. Recibe comandas de salón filtradas exclusivamente por estación BARRA.',
    allowedTabs: [
      'tab-kds', 'tab-inventory', 'tab-copilot'
    ],
    permissions: {
      createOrder: false,
      manageKds: true,
      settleFiscal: false,
      cashBlindAudit: false,
      fefoStock: true,
      cryptoAudit: false,
      voidWithoutPin: false,
      financialReports: false
    },
    voiceExamples: [
      '"Marcar listo trago Negroni mesa 3"',
      '"¿Qué vino Malbec marida mejor con bife de chorizo?"',
      '"Consultar stock de botellas de Gin"'
    ]
  },
  WAITER: {
    level: 6,
    code: 'WAITER',
    name: 'Juan Mozo (Tablet)',
    avatar: '📱',
    label: 'Mozo / Salón (Nivel 6)',
    device: 'Tablet / Celular del Mozo por Wi-Fi',
    description: 'Toma de pedidos en mesa, adición de platos por voz, solicitud de cuenta y consulta rápida de alérgenos o maridajes con el Sommelier IA.',
    allowedTabs: [
      'tab-pos', 'tab-menu', 'tab-reservations', 'tab-copilot'
    ],
    permissions: {
      createOrder: true,
      manageKds: false,
      settleFiscal: false, // El mozo solicita cuenta, no cobra en gaveta
      cashBlindAudit: false,
      fefoStock: false,
      cryptoAudit: false,
      voidWithoutPin: false, // Requiere PIN 1234
      financialReports: false
    },
    voiceExamples: [
      '"Comanda mesa 1: 2 bifes de chorizo jugosos"',
      '"Pedir cuenta mesa 3"',
      '"¿Qué platos no tienen gluten ni lactosa?"',
      '"¿Qué mesa está libre para 4 personas?"'
    ]
  },
  RUNNER_HOST: {
    level: 7,
    code: 'RUNNER_HOST',
    name: 'Hostess Entrada',
    avatar: '🚪',
    label: 'Recepción (Nivel 7)',
    device: 'Tablet en Atril de Entrada',
    description: 'Recepción de comensales, gestión del libro de reservas, asignación de mesas libres y entrega de platos listos desde el pase a mesa.',
    allowedTabs: [
      'tab-pos', 'tab-reservations'
    ],
    permissions: {
      createOrder: false,
      manageKds: false,
      settleFiscal: false,
      cashBlindAudit: false,
      fefoStock: false,
      cryptoAudit: false,
      voidWithoutPin: false,
      financialReports: false
    },
    voiceExamples: [
      '"Reservar mesa para 2 personas hoy a las 21:30"',
      '"¿Qué mesas están libres en Salón Principal?"',
      '"Marcar mesa 4 como ocupada"'
    ]
  }
};

export function setupRoleMatrixDemo(onRoleChangeCallback) {
  const btnTrigger = document.getElementById('btn-show-role-matrix');
  const modal = document.getElementById('modal-role-matrix');

  if (btnTrigger && modal) {
    btnTrigger.addEventListener('click', () => {
      const currentRole = document.getElementById('select-session-role')?.value || 'MANAGER';
      renderRoleMatrixContent(currentRole, onRoleChangeCallback);
      modal.classList.add('active');
    });
  }
}

export function renderRoleMatrixContent(selectedRoleCode, onRoleChangeCallback) {
  const roleDef = ROLE_DEFINITIONS[selectedRoleCode] || ROLE_DEFINITIONS.MANAGER;

  // Header
  const headerIcon = document.getElementById('matrix-header-icon');
  const curAvatar = document.getElementById('matrix-current-avatar');
  const curName = document.getElementById('matrix-current-name');
  const curBadge = document.getElementById('matrix-current-badge');

  if (headerIcon) headerIcon.textContent = roleDef.avatar;
  if (curAvatar) curAvatar.textContent = roleDef.avatar;
  if (curName) curName.textContent = roleDef.name;
  if (curBadge) curBadge.textContent = roleDef.label;

  // Render Botones Rápidos de Roles
  const btnContainer = document.getElementById('matrix-quick-role-buttons');
  if (btnContainer) {
    btnContainer.innerHTML = Object.keys(ROLE_DEFINITIONS).map(code => {
      const r = ROLE_DEFINITIONS[code];
      const isSelected = code === selectedRoleCode;
      return `
        <button type="button" 
          class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'}" 
          style="padding: 4px 8px; font-size: 0.72rem; ${isSelected ? '' : 'border-color: rgba(255,255,255,0.15);'}"
          onclick="window.selectDemoRole('${code}')"
        >
          ${r.avatar} ${code}
        </button>
      `;
    }).join('');
  }

  // Render Tarjeta de Alcance Detallado
  const scopeContainer = document.getElementById('role-scope-details');
  if (scopeContainer) {
    const permBadge = (allowed, text) => allowed
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:rgba(42,157,143,0.15); color:var(--accent-green); padding:3px 8px; border-radius:4px; border:1px solid rgba(42,157,143,0.3);">✅ ${text}</span>`
      : `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:rgba(239,68,68,0.15); color:var(--accent-red); padding:3px 8px; border-radius:4px; border:1px solid rgba(239,68,68,0.3);">⛔ ${text}</span>`;

    scopeContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
        <div>
          <h4 style="margin: 0 0 4px; font-size: 1.05rem; color: #fff;">
            ${roleDef.avatar} ${roleDef.name} — <span style="color: var(--accent-gold);">${roleDef.label}</span>
          </h4>
          <p style="margin: 0 0 10px; font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">
            ${roleDef.description}
          </p>
          <div style="font-size: 0.75rem; color: var(--primary); margin-bottom: 8px;">
            📱 <strong>Dispositivo habitual:</strong> ${roleDef.device}
          </div>
        </div>
        <button type="button" class="btn btn-primary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="window.applyDemoRoleAndClose('${roleDef.code}')">
          ⚡ Activar Rol en la App
        </button>
      </div>

      <div style="margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
        <div style="font-size: 0.78rem; font-weight: 700; color: #fff; margin-bottom: 6px;">Privilegios y Acciones de Seguridad:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${permBadge(roleDef.permissions.createOrder, 'Tomar / Abrir Comandas')}
          ${permBadge(roleDef.permissions.manageKds, 'Despacho Táctil KDS Cocina')}
          ${permBadge(roleDef.permissions.settleFiscal, 'Cobro & Facturación ARCA')}
          ${permBadge(roleDef.permissions.cashBlindAudit, 'Apertura / Arqueo de Caja')}
          ${permBadge(roleDef.permissions.fefoStock, 'Gestión de Stock FEFO')}
          ${permBadge(roleDef.permissions.cryptoAudit, 'Auditoría Criptográfica SHA-256')}
          ${permBadge(roleDef.permissions.voidWithoutPin, 'Anular sin PIN')}
          ${permBadge(roleDef.permissions.financialReports, 'Ver Métricas Financieras')}
        </div>
      </div>

      <div style="margin-top: 12px; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 6px;">
        <div style="font-size: 0.75rem; color: var(--accent-gold); font-weight: 700;">🎤 Comandos de Voz de Ejemplo para este Puesto:</div>
        <div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 4px; line-height: 1.4;">
          ${roleDef.voiceExamples.map(ex => `• <em>${ex}</em>`).join('<br>')}
        </div>
      </div>
    `;
  }

  // Render Tabla Matriz Comparativa
  const tbody = document.getElementById('matrix-table-body');
  if (tbody) {
    tbody.innerHTML = Object.keys(ROLE_DEFINITIONS).map(code => {
      const r = ROLE_DEFINITIONS[code];
      const isCur = code === selectedRoleCode;
      const chk = (val) => val ? '<span style="color:#2a9d8f; font-weight:700;">✓</span>' : '<span style="color:#ef4444; opacity:0.6;">✕</span>';

      return `
        <tr style="${isCur ? 'background: rgba(224,169,109,0.12); font-weight: 600;' : ''}; cursor: pointer;" onclick="window.selectDemoRole('${code}')">
          <td>
            <span>${r.avatar}</span> <strong>${code}</strong> 
            <small style="color: #94a3b8; display: block;">${r.label.split(':')[1] || r.label}</small>
          </td>
          <td style="color: #94a3b8; font-size: 0.72rem;">${r.device.split('(')[0]}</td>
          <td style="text-align: center;">${chk(r.permissions.createOrder)}</td>
          <td style="text-align: center;">${chk(r.permissions.manageKds)}</td>
          <td style="text-align: center;">${chk(r.permissions.settleFiscal)}</td>
          <td style="text-align: center;">${chk(r.permissions.cashBlindAudit)}</td>
          <td style="text-align: center;">${chk(r.permissions.fefoStock)}</td>
          <td style="text-align: center;">${chk(r.permissions.cryptoAudit)}</td>
        </tr>
      `;
    }).join('');
  }
}

// Exponer a window para interactividad en HTML
window.selectDemoRole = function(code) {
  renderRoleMatrixContent(code);
};

window.applyDemoRoleAndClose = function(code) {
  const select = document.getElementById('select-session-role');
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event('change'));
  }
  document.getElementById('modal-role-matrix')?.classList.remove('active');
};
