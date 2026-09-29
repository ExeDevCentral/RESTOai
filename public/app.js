// RESTOia - Frontend Application Logic

const state = {
  currentTab: 'tab-pos',
  tables: [],
  menu: [],
  orders: [],
  reservations: [],
  analytics: {},
  trayItems: [], // Ítems seleccionados para la comanda actual
  selectedArea: 'all',
  selectedCategory: 'all',
  selectedTableForOrder: null
};

// ========================
// INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAreaFilters();
  setupCategoryFilters();
  setupOrderTrayEvents();
  setupReservationForm();
  setupAIChat();
  setupModalEvents();

  // Cargar datos iniciales
  fetchAllData();

  // Polling automático cada 8 segundos para simular KDS y mesas en vivo
  setInterval(fetchOrdersAndTables, 8000);
});

// ========================
// SERVICIOS API
// ========================
async function fetchAllData() {
  await Promise.all([
    fetchTables(),
    fetchMenu(),
    fetchOrders(),
    fetchReservations(),
    fetchAnalytics()
  ]);
  renderAll();
}

async function fetchOrdersAndTables() {
  await Promise.all([fetchTables(), fetchOrders()]);
  renderTables();
  renderKDS();
  updateKdsBadge();
}

async function fetchTables() {
  try {
    const res = await fetch('/api/tables');
    const json = await res.json();
    if (json.success) state.tables = json.data;
  } catch (e) {
    console.error('Error cargando mesas', e);
  }
}

async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    const json = await res.json();
    if (json.success) state.menu = json.data;
  } catch (e) {
    console.error('Error cargando menú', e);
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const json = await res.json();
    if (json.success) state.orders = json.data;
  } catch (e) {
    console.error('Error cargando comandas', e);
  }
}

async function fetchReservations() {
  try {
    const res = await fetch('/api/reservations');
    const json = await res.json();
    if (json.success) state.reservations = json.data;
  } catch (e) {
    console.error('Error cargando reservas', e);
  }
}

async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const json = await res.json();
    if (json.success) state.analytics = json.data;
  } catch (e) {
    console.error('Error cargando analíticas', e);
  }
}

// ========================
// RENDERIZADO GENERAL
// ========================
function renderAll() {
  renderTables();
  renderKDS();
  renderMenu();
  renderTableSelects();
  renderReservations();
  updateKdsBadge();
  updateStatsBar();
}

function updateKdsBadge() {
  const pendingCount = state.orders.filter(o => o.status === 'pendiente' || o.status === 'en_cocina').length;
  const badge = document.getElementById('kds-badge');
  if (badge) {
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

function updateStatsBar() {
  document.getElementById('stat-total-tables').textContent = state.tables.length;
  document.getElementById('stat-occupied-tables').textContent = state.tables.filter(t => t.status === 'ocupada' || t.status === 'cuenta_pedida').length;
  document.getElementById('stat-free-tables').textContent = state.tables.filter(t => t.status === 'libre').length;
  
  const totalSales = state.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-active-sales').textContent = `$${totalSales.toLocaleString('es-AR')}`;
}

// ========================
// VISTA: MESAS (POS)
// ========================
function renderTables() {
  const container = document.getElementById('tables-grid');
  if (!container) return;

  const filtered = state.selectedArea === 'all' 
    ? state.tables 
    : state.tables.filter(t => t.area === state.selectedArea);

  container.innerHTML = filtered.map(table => {
    const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
    const orderTotal = currentOrder ? `$${currentOrder.total.toLocaleString('es-AR')}` : '-';

    return `
      <div class="table-card status-${table.status}" onclick="openTableModal(${table.id})">
        <div class="table-card-top">
          <span class="table-badge">${formatStatus(table.status)}</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">${table.capacity} Personas</span>
        </div>
        <div class="table-number">${table.number}</div>
        <div class="table-details">${table.area}</div>
        <div class="table-bill-amount">
          <span>Cuenta:</span>
          <strong>${orderTotal}</strong>
        </div>
      </div>
    `;
  }).join('');
}

function formatStatus(status) {
  const map = {
    'libre': '🟢 Libre',
    'ocupada': '🟡 Ocupada',
    'cuenta_pedida': '🔴 Cuenta Pedida',
    'reservada': '🔵 Reservada'
  };
  return map[status] || status;
}

// ========================
// VISTA: COCINA KDS
// ========================
function renderKDS() {
  const listPendiente = document.getElementById('kds-list-pendiente');
  const listCocina = document.getElementById('kds-list-cocina');
  const listListo = document.getElementById('kds-list-listo');

  const pendientes = state.orders.filter(o => o.status === 'pendiente');
  const enCocina = state.orders.filter(o => o.status === 'en_cocina');
  const listos = state.orders.filter(o => o.status === 'listo');

  document.getElementById('count-pending').textContent = pendientes.length;
  document.getElementById('count-cooking').textContent = enCocina.length;
  document.getElementById('count-ready').textContent = listos.length;

  const renderCard = (order, nextStatus, nextLabel, btnClass = 'btn-primary') => `
    <div class="kds-card">
      <div class="kds-card-head">
        <strong>Mesa ${order.tableNumber}</strong>
        <span class="kds-time">${formatTimeAgo(order.createdAt)}</span>
      </div>
      <small style="color: #94a3b8;">Mozo: ${order.waiter}</small>
      <ul class="kds-items">
        ${order.items.map(i => `
          <li>
            <span><strong>${i.quantity}x</strong> ${i.name}</span>
            ${i.notes ? `<div class="kds-note">Nota: ${i.notes}</div>` : ''}
          </li>
        `).join('')}
      </ul>
      <div class="kds-actions">
        ${nextStatus ? `
          <button class="btn ${btnClass} btn-block" onclick="updateOrderStatus(${order.id}, '${nextStatus}')">
            ${nextLabel}
          </button>
        ` : ''}
      </div>
    </div>
  `;

  listPendiente.innerHTML = pendientes.map(o => renderCard(o, 'en_cocina', '🔥 Iniciar Preparación')).join('');
  listCocina.innerHTML = enCocina.map(o => renderCard(o, 'listo', '🛎️ Marcar Listo para Servir')).join('');
  listListo.innerHTML = listos.map(o => renderCard(o, 'cobrado', '✅ Entregado & Finalizar', 'btn-secondary')).join('');
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const diffMins = Math.floor((new Date() - new Date(isoString)) / 60000);
  if (diffMins < 1) return 'Hace instantes';
  return `Hace ${diffMins} min`;
}

async function updateOrderStatus(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      await fetchOrdersAndTables();
    }
  } catch (e) {
    console.error('Error actualizando comanda', e);
  }
}

// ========================
// VISTA: CARTA & TOMA DE COMANDA
// ========================
function renderMenu() {
  const container = document.getElementById('menu-grid');
  if (!container) return;

  const filtered = state.selectedCategory === 'all'
    ? state.menu
    : state.menu.filter(m => m.category.toLowerCase() === state.selectedCategory.toLowerCase());

  container.innerHTML = filtered.map(item => `
    <div class="menu-item-card">
      <div>
        <h4>${item.name}</h4>
        <p>${item.description}</p>
        ${item.allergens && item.allergens.length ? `
          <div style="font-size: 0.72rem; color: #e9c46a; margin-bottom: 8px;">
            ⚠️ Alérgenos: ${item.allergens.join(', ')}
          </div>
        ` : ''}
      </div>
      <div class="menu-item-footer">
        <span class="item-price">$${item.price.toLocaleString('es-AR')}</span>
        <button class="btn-add-item" onclick="addToTray(${item.id})">➕ Agregar</button>
      </div>
    </div>
  `).join('');
}

function addToTray(itemId) {
  const menuItem = state.menu.find(m => m.id === itemId);
  if (!menuItem) return;

  const existing = state.trayItems.find(i => i.menuItemId === itemId);
  if (existing) {
    existing.quantity++;
  } else {
    state.trayItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      notes: ""
    });
  }
  renderTray();
}

function changeTrayQty(itemId, delta) {
  const item = state.trayItems.find(i => i.menuItemId === itemId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.trayItems = state.trayItems.filter(i => i.menuItemId !== itemId);
  }
  renderTray();
}

function renderTray() {
  const container = document.getElementById('tray-items');
  if (!container) return;

  if (state.trayItems.length === 0) {
    container.innerHTML = `<div class="empty-tray">Selecciona ítems de la carta para agregarlos a la comanda</div>`;
    document.getElementById('tray-subtotal').textContent = '$0';
    document.getElementById('tray-service').textContent = '$0';
    document.getElementById('tray-total').textContent = '$0';
    return;
  }

  container.innerHTML = state.trayItems.map(item => `
    <div class="tray-row">
      <div>
        <strong>${item.name}</strong>
        <div style="color: #94a3b8; font-size: 0.78rem;">$${item.price.toLocaleString('es-AR')} c/u</div>
      </div>
      <div class="tray-row-actions">
        <button class="qty-btn" onclick="changeTrayQty(${item.menuItemId}, -1)">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" onclick="changeTrayQty(${item.menuItemId}, 1)">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = state.trayItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const service = Math.round(subtotal * 0.10);
  const total = subtotal + service;

  document.getElementById('tray-subtotal').textContent = `$${subtotal.toLocaleString('es-AR')}`;
  document.getElementById('tray-service').textContent = `$${service.toLocaleString('es-AR')}`;
  document.getElementById('tray-total').textContent = `$${total.toLocaleString('es-AR')}`;
}

function renderTableSelects() {
  const selectOrder = document.getElementById('select-target-table');
  const selectRes = document.getElementById('res-table');

  const options = state.tables.map(t => `<option value="${t.id}">Mesa ${t.number} (${t.area}) - ${t.status}</option>`).join('');
  if (selectOrder) selectOrder.innerHTML = options;
  if (selectRes) selectRes.innerHTML = `<option value="">Asignación Automática / Al Llegar</option>` + options;
}

function setupOrderTrayEvents() {
  const btnSend = document.getElementById('btn-send-to-kitchen');
  if (!btnSend) return;

  btnSend.addEventListener('click', async () => {
    if (state.trayItems.length === 0) {
      alert('Agrega al menos un plato a la comanda.');
      return;
    }

    const select = document.getElementById('select-target-table');
    const tableId = select.value;
    const table = state.tables.find(t => t.id === parseInt(tableId));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableNumber: table ? table.number : `M-${tableId}`,
          waiter: "Facundo M.",
          items: state.trayItems
        })
      });

      if (res.ok) {
        state.trayItems = [];
        renderTray();
        await fetchAllData();
        // Cambiar a pestaña KDS
        document.querySelector('[data-tab="tab-kds"]').click();
      }
    } catch (e) {
      console.error('Error enviando comanda', e);
    }
  });
}

// ========================
// VISTA: RESERVAS
// ========================
function renderReservations() {
  const container = document.getElementById('reservations-list');
  if (!container) return;

  if (state.reservations.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8;">No hay reservas registradas hoy.</p>`;
    return;
  }

  container.innerHTML = state.reservations.map(res => `
    <div class="res-item-card">
      <div>
        <strong>${res.customerName}</strong>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          ⏰ ${res.time} hs | 👥 ${res.guests} comensales | 📞 ${res.phone}
        </div>
        ${res.notes ? `<div style="font-size: 0.78rem; color: #e9c46a; margin-top: 4px;">📝 ${res.notes}</div>` : ''}
      </div>
      <div>
        <span class="table-badge" style="background: rgba(69, 123, 157, 0.2); color: #457b9d;">
          ${res.tableId ? `Mesa M-0${res.tableId}` : 'Sin Mesa'}
        </span>
      </div>
    </div>
  `).join('');
}

function setupReservationForm() {
  const form = document.getElementById('form-new-reservation');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('res-name').value;
    const phone = document.getElementById('res-phone').value;
    const guests = document.getElementById('res-guests').value;
    const date = document.getElementById('res-date').value;
    const time = document.getElementById('res-time').value;
    const tableId = document.getElementById('res-table').value;
    const notes = document.getElementById('res-notes').value;

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, phone, guests, date, time, tableId, notes })
      });

      if (res.ok) {
        form.reset();
        await fetchReservations();
        await fetchTables();
        renderReservations();
        renderTables();
        alert('✅ Reserva registrada con éxito.');
      }
    } catch (e) {
      console.error('Error creando reserva', e);
    }
  });
}

// ========================
// VISTA: COPILOT IA
// ========================
function setupAIChat() {
  const btnSend = document.getElementById('btn-send-ai');
  const input = document.getElementById('ai-input');
  const chips = document.querySelectorAll('.quick-chip');

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;

    appendChatMessage('user', text);
    input.value = '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const json = await res.json();
      if (json.success) {
        appendChatMessage('bot', json.data.message, json.data.title);
      }
    } catch (e) {
      appendChatMessage('bot', 'Hubo un error de conexión con el motor de IA.');
    }
  };

  btnSend.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(input.value);
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      sendMessage(prompt);
    });
  });
}

function appendChatMessage(sender, text, title = '') {
  const box = document.getElementById('ai-chat-box');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender}`;

  // Formato markdown simple a HTML
  const formattedText = text
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  msgDiv.innerHTML = `
    <div class="msg-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
    <div class="msg-content">
      ${title ? `<strong>${title}</strong>` : ''}
      <p>${formattedText}</p>
    </div>
  `;

  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
}

// ========================
// MODAL DETALLE DE MESA
// ========================
window.openTableModal = function(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
  const modal = document.getElementById('modal-table-detail');
  const title = document.getElementById('modal-table-title');
  const body = document.getElementById('modal-table-body');
  const footer = document.getElementById('modal-table-footer');

  title.textContent = `Mesa ${table.number} (${table.area})`;

  let contentHtml = `
    <p><strong>Estado:</strong> ${formatStatus(table.status)}</p>
    <p><strong>Capacidad:</strong> ${table.capacity} comensales</p>
  `;

  if (currentOrder) {
    contentHtml += `
      <hr style="border: var(--glass-border); margin: 12px 0;">
      <h4>Comanda #${currentOrder.id} (${currentOrder.waiter})</h4>
      <ul style="list-style: none; margin: 10px 0;">
        ${currentOrder.items.map(i => `
          <li style="display:flex; justify-content:space-between; padding: 4px 0;">
            <span>${i.quantity}x ${i.name}</span>
            <span>$${(i.price * i.quantity).toLocaleString('es-AR')}</span>
          </li>
        `).join('')}
      </ul>
      <h3 style="margin-top: 12px; color: var(--primary);">Total: $${currentOrder.total.toLocaleString('es-AR')}</h3>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="closeTableModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="settleBill(${currentOrder.id})">💳 Cobrar y Liberar Mesa</button>
    `;
  } else {
    contentHtml += `<p style="margin-top: 14px; color: #94a3b8;">La mesa está libre y lista para recibir comensales.</p>`;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="closeTableModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="startNewOrderForTable(${table.id})">📋 Abrir Comanda</button>
    `;
  }

  body.innerHTML = contentHtml;
  modal.classList.add('open');
};

window.closeTableModal = function() {
  document.getElementById('modal-table-detail').classList.remove('open');
};

window.settleBill = async function(orderId) {
  await updateOrderStatus(orderId, 'cobrado');
  closeTableModal();
  await fetchAllData();
};

window.startNewOrderForTable = function(tableId) {
  closeTableModal();
  document.querySelector('[data-tab="tab-menu"]').click();
  const select = document.getElementById('select-target-table');
  if (select) select.value = tableId;
};

function setupModalEvents() {
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeTableModal);
}

// ========================
// FILTROS Y NAVEGACIÓN
// ========================
function setupNavigation() {
  const buttons = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const viewTitle = document.getElementById('view-title');
  const viewDesc = document.getElementById('view-desc');

  const titlesMap = {
    'tab-pos': { title: 'Mapa de Salón y Mesas (POS)', desc: 'Supervisión en tiempo real de ocupación, comandas y cuentas.' },
    'tab-kds': { title: 'Kitchen Display System (KDS)', desc: 'Gestión y control de tiempos de preparación en cocina.' },
    'tab-menu': { title: 'Carta & Toma de Pedidos', desc: 'Catálogo de platos y armado dinámico de comandas.' },
    'tab-reservations': { title: 'Gestión de Reservas', desc: 'Planificación de comensales y turnos de sala.' },
    'tab-copilot': { title: 'Copilot IA Gastronómico', desc: 'Asesor de maridaje, alérgenos y sugerencias de optimización.' },
    'tab-analytics': { title: 'Métricas & Desempeño', desc: 'Facturación acumulada, platos estrella y tiempos medios.' }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      buttons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(tab);
      if (targetPane) targetPane.classList.add('active');

      if (titlesMap[tab]) {
        viewTitle.textContent = titlesMap[tab].title;
        viewDesc.textContent = titlesMap[tab].desc;
      }
    });
  });

  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) btnRefresh.addEventListener('click', () => fetchAllData());

  const btnQuickOrder = document.getElementById('btn-quick-order');
  if (btnQuickOrder) btnQuickOrder.addEventListener('click', () => {
    document.querySelector('[data-tab="tab-menu"]').click();
  });
}

function setupAreaFilters() {
  const pills = document.querySelectorAll('.area-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedArea = pill.getAttribute('data-area');
      renderTables();
    });
  });
}

function setupCategoryFilters() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategory = pill.getAttribute('data-cat');
      renderMenu();
    });
  });
}
