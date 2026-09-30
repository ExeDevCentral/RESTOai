// Cash Register & Blind Audit View Module
export function renderCashView(state) {
  const session = state.cashSession?.activeSession;
  const statusBadge = document.getElementById('cash-session-status-badge');
  const statusText = document.getElementById('cash-session-status-text');
  const metaText = document.getElementById('cash-session-meta-text');
  const expectedAmount = document.getElementById('cash-expected-amount');
  const inflowOutflowSub = document.getElementById('cash-inflow-outflow-sub');
  const digitalAmount = document.getElementById('cash-digital-amount');
  const movementsContainer = document.getElementById('cash-movements-container');
  const historyContainer = document.getElementById('cash-history-container');
  const closeExpectedDisplay = document.getElementById('close-expected-cash-display');
  const closeDigitalDisplay = document.getElementById('close-digital-sales-display');

  if (session && session.status === 'OPEN') {
    if (statusBadge) {
      statusBadge.textContent = 'TURNO ABIERTO (EN CURSO)';
      statusBadge.style.background = 'rgba(42, 157, 143, 0.2)';
      statusBadge.style.color = '#2a9d8f';
      statusBadge.style.border = '1px solid #2a9d8f';
    }
    if (statusText) {
      statusText.textContent = `Turno de: ${session.cashierName}`;
      statusText.style.color = '#fff';
    }
    if (metaText) {
      const openTime = new Date(session.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      metaText.textContent = `Fondo inicial: $${(session.initialFloat || 0).toLocaleString('es-AR')} • Abierto hoy a las ${openTime}`;
    }

    if (expectedAmount) {
      expectedAmount.textContent = `$${(session.expectedCash || 0).toLocaleString('es-AR')}`;
    }
    if (inflowOutflowSub) {
      inflowOutflowSub.textContent = `Fondo: $${(session.initialFloat || 0).toLocaleString('es-AR')} | Cobros Efvo: +$${(session.cashInflow || 0).toLocaleString('es-AR')} | Retiros: -$${(session.cashOutflow || 0).toLocaleString('es-AR')}`;
    }
    if (digitalAmount) {
      digitalAmount.textContent = `$${(session.digitalSales || 0).toLocaleString('es-AR')}`;
    }

    if (closeExpectedDisplay) {
      closeExpectedDisplay.textContent = `$${(session.expectedCash || 0).toLocaleString('es-AR')}`;
    }
    if (closeDigitalDisplay) {
      closeDigitalDisplay.textContent = `$${(session.digitalSales || 0).toLocaleString('es-AR')}`;
    }

    // Render Movimientos
    if (movementsContainer) {
      const movements = session.movements || [];
      if (movements.length === 0) {
        movementsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No hay ingresos extraordinarios ni retiros registrados en este turno.</p>';
      } else {
        movementsContainer.innerHTML = `
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
              ${movements.map(m => `
                <tr>
                  <td>${new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <span class="badge ${m.type === 'INGRESO' ? 'badge-confirmed' : 'badge-occupied'}" style="font-size: 0.75rem;">
                      ${m.type === 'INGRESO' ? '💰 INGRESO' : '💸 RETIRO'}
                    </span>
                  </td>
                  <td>${m.reason}</td>
                  <td style="text-align: right; font-weight: 600; color: ${m.type === 'INGRESO' ? '#2a9d8f' : '#ef4444'};">
                    ${m.type === 'INGRESO' ? '+' : '-'}$${(m.amount || 0).toLocaleString('es-AR')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } else {
    // Sin sesión activa
    if (statusBadge) {
      statusBadge.textContent = 'SIN TURNO ACTIVO';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#ef4444';
      statusBadge.style.border = '1px solid #ef4444';
    }
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

  // Render Historial de Sesiones Pasadas
  if (historyContainer) {
    const closedSessions = (state.cashSession?.history || []).filter(s => s.status === 'CLOSED');
    if (closedSessions.length === 0) {
      historyContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No hay turnos cerrados registrados todavía.</p>';
    } else {
      historyContainer.innerHTML = `
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
            ${closedSessions.map(s => {
              const diff = s.discrepancy || 0;
              const diffColor = diff === 0 ? '#2a9d8f' : diff > 0 ? '#457b9d' : '#ef4444';
              const diffText = diff === 0 ? 'Exacto' : `${diff > 0 ? '+' : ''}$${diff.toLocaleString('es-AR')}`;
              return `
                <tr>
                  <td><strong>${s.id}</strong></td>
                  <td>${s.cashierName}</td>
                  <td>${new Date(s.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td style="text-align: right;">$${(s.initialFloat || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right;">$${(s.expectedCash || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right;">$${(s.actualCash || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right; font-weight: 600; color: ${diffColor};">${diffText}</td>
                  <td>
                    <span class="badge ${diff === 0 ? 'badge-confirmed' : 'badge-occupied'}" style="font-size: 0.72rem;">
                      ${s.authorizedByPin ? '🔐 APROBADO PIN' : '✅ SUPERVISADO'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }
}
