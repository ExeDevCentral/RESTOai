// Cash Register & Blind Audit View Module

function updateActiveSessionUI(session) {
  const statusText = document.getElementById('cash-session-status-text');
  const metaText = document.getElementById('cash-session-meta');
  const expectedAmount = document.getElementById('cash-expected-amount');
  const inflowOutflowSub = document.getElementById('cash-inflow-outflow-sub');
  const digitalAmount = document.getElementById('cash-digital-amount');
  const closeExpectedDisplay = document.getElementById('close-cash-expected-display');
  const closeDigitalDisplay = document.getElementById('close-cash-digital-display');

  if (statusText) {
    statusText.textContent = `Turno de: ${session.cashierName}`;
    statusText.style.color = '#2a9d8f';
  }
  if (metaText) {
    const openTime = new Date(session.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    metaText.textContent = `Fondo inicial: $${(session.initialFloat || 0).toLocaleString('es-AR')} • Abierto hoy a las ${openTime}`;
  }

  const expectedStr = `$${(session.expectedCash || 0).toLocaleString('es-AR')}`;
  const digitalStr = `$${(session.digitalSales || 0).toLocaleString('es-AR')}`;

  if (expectedAmount) expectedAmount.textContent = expectedStr;
  if (inflowOutflowSub) {
    inflowOutflowSub.textContent = `Fondo: $${(session.initialFloat || 0).toLocaleString('es-AR')} | Cobros Efvo: +$${(session.cashInflow || 0).toLocaleString('es-AR')} | Retiros: -$${(session.cashOutflow || 0).toLocaleString('es-AR')}`;
  }
  if (digitalAmount) digitalAmount.textContent = digitalStr;
  if (closeExpectedDisplay) closeExpectedDisplay.textContent = expectedStr;
  if (closeDigitalDisplay) closeDigitalDisplay.textContent = digitalStr;
}

function updateInactiveSessionUI() {
  const statusText = document.getElementById('cash-session-status-text');
  const metaText = document.getElementById('cash-session-meta');
  const expectedAmount = document.getElementById('cash-expected-amount');
  const inflowOutflowSub = document.getElementById('cash-inflow-outflow-sub');
  const digitalAmount = document.getElementById('cash-digital-amount');
  const closeExpectedDisplay = document.getElementById('close-cash-expected-display');
  const closeDigitalDisplay = document.getElementById('close-cash-digital-display');
  const movementsContainer = document.getElementById('cash-movements-table-container');

  if (statusText) {
    statusText.textContent = 'SIN SESIÓN ABIERTA';
    statusText.style.color = '#ef4444';
  }
  if (metaText) metaText.textContent = 'Abre un turno con fondo inicial para habilitar cobros en gaveta y arqueo.';
  if (expectedAmount) expectedAmount.textContent = '$0';
  if (inflowOutflowSub) inflowOutflowSub.textContent = 'Fondo: $0 | Ingresos: $0 | Egresos: $0';
  if (digitalAmount) digitalAmount.textContent = '$0';
  if (closeExpectedDisplay) closeExpectedDisplay.textContent = '$0';
  if (closeDigitalDisplay) closeDigitalDisplay.textContent = '$0';

  if (movementsContainer) {
    movementsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">Abre un turno de caja para registrar y visualizar movimientos de gaveta en vivo.</p>';
  }
}

function renderMovements(movements = []) {
  const container = document.getElementById('cash-movements-table-container');
  if (!container) return;

  if (movements.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No hay ingresos extraordinarios ni retiros registrados en este turno.</p>';
    return;
  }

  const rows = movements.map(m => {
    const isIngreso = m.type === 'INGRESO';
    const badgeClass = isIngreso ? 'badge-confirmed' : 'badge-occupied';
    const badgeText = isIngreso ? '💰 INGRESO' : '💸 RETIRO';
    const color = isIngreso ? '#2a9d8f' : '#ef4444';
    const sign = isIngreso ? '+' : '-';
    const time = new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td>${time}</td>
        <td>
          <span class="badge ${badgeClass}" style="font-size: 0.75rem;">
            ${badgeText}
          </span>
        </td>
        <td>${m.reason}</td>
        <td style="text-align: right; font-weight: 600; color: ${color};">
          ${sign}$${(m.amount || 0).toLocaleString('es-AR')}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Hora</th>
          <th>Tipo</th>
          <th>Concepto / Motivo</th>
          <th style="text-align: right;">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function getDiscrepancyMeta(diff) {
  if (diff > 0) {
    return { color: '#457b9d', text: `+$${diff.toLocaleString('es-AR')}` };
  }
  if (diff < 0) {
    return { color: '#ef4444', text: `$${diff.toLocaleString('es-AR')}` };
  }
  return { color: '#2a9d8f', text: 'Exacto' };
}

function renderHistory(history = []) {
  const container = document.getElementById('cash-history-table-container');
  if (!container) return;

  const closedSessions = history.filter(s => s.status === 'CLOSED');
  if (closedSessions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No hay turnos cerrados registrados todavía.</p>';
    return;
  }

  const rows = closedSessions.map(s => {
    const diff = s.discrepancy || 0;
    const { color: diffColor, text: diffText } = getDiscrepancyMeta(diff);
    const openTime = new Date(s.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const closeTime = s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-';
    const authText = s.authorizedByPin ? '🔐 APROBADO PIN' : '✅ SUPERVISADO';

    return `
      <tr>
        <td><strong>${s.id}</strong></td>
        <td>${s.cashierName}</td>
        <td>${openTime}</td>
        <td>${closeTime}</td>
        <td style="text-align: right;">$${(s.initialFloat || 0).toLocaleString('es-AR')}</td>
        <td style="text-align: right;">$${(s.expectedCash || 0).toLocaleString('es-AR')}</td>
        <td style="text-align: right;">$${(s.actualCash || 0).toLocaleString('es-AR')}</td>
        <td style="text-align: right; font-weight: 600; color: ${diffColor};">${diffText}</td>
        <td>
          <span class="badge ${diff === 0 ? 'badge-confirmed' : 'badge-occupied'}" style="font-size: 0.72rem;">
            ${authText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th>ID Turno</th>
          <th>Cajero</th>
          <th>Apertura</th>
          <th>Cierre</th>
          <th style="text-align: right;">Fondo Inicial</th>
          <th style="text-align: right;">Esperado</th>
          <th style="text-align: right;">Real Declarado</th>
          <th style="text-align: right;">Diferencia</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function renderCashView(state) {
  const session = state.cashSession?.activeSession;

  if (session?.status === 'OPEN') {
    updateActiveSessionUI(session);
    renderMovements(session.movements || []);
  } else {
    updateInactiveSessionUI();
  }

  renderHistory(state.cashSession?.history || []);
}

export const cashView = {
  render(state) {
    renderCashView(state);
  },
  mount() {},
  cleanup() {}
};

