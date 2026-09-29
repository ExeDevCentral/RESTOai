// RESTOia - Frontend Application Logic

const state = {
  currentTab: 'tab-pos',
  tables: [],
  menu: [],
  orders: [],
  reservations: [],
  inventory: [],
  suppliers: [],
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
  setupInventoryEvents();
  setupSupplierEvents();
  setupMenuManagementEvents();

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
    fetchInventory(),
    fetchSuppliers(),
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

async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    const json = await res.json();
    if (json.success) state.inventory = json.data;
  } catch (e) {
    console.error('Error cargando inventario', e);
  }
}

async function fetchSuppliers() {
  try {
    const res = await fetch('/api/suppliers');
    const json = await res.json();
    if (json.success) state.suppliers = json.data;
  } catch (e) {
    console.error('Error cargando proveedores', e);
  }
}

// ========================
// RENDERIZADO GENERAL
// ========================
function renderAll() {
  renderTables();
  renderKDS();
  renderMenu();
  renderInventory();
  renderSuppliers();
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
    <div class="menu-item-card" style="position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <h4 style="margin: 0;">${item.name}</h4>
        <div style="display: flex; gap: 6px;">
          <button title="Editar plato" onclick="openEditDishModal(${item.id})" style="background: none; border: none; cursor: pointer; font-size: 0.9rem;">✏️</button>
          <button title="Eliminar plato" onclick="deleteDish(${item.id})" style="background: none; border: none; cursor: pointer; font-size: 0.9rem;">🗑️</button>
        </div>
      </div>
      <p style="margin-top: 6px;">${item.description}</p>
      ${item.allergens && item.allergens.length ? `
        <div style="font-size: 0.72rem; color: #e9c46a; margin-bottom: 8px;">
          ⚠️ Alérgenos: ${item.allergens.join(', ')}
        </div>
      ` : ''}
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
    'tab-inventory': { title: 'Control de Stock, Lotes FEFO & Escáner', desc: 'Ingreso por código de barras, vencimientos y valorización de inventario.' },
    'tab-suppliers': { title: 'Directorio de Proveedores & Compras', desc: 'Homologación de distribuidores, CUIT fiscal y órdenes de abastecimiento.' },
    'tab-reservations': { title: 'Gestión de Reservas', desc: 'Planificación de comensales y turnos de sala.' },
    'tab-copilot': { title: 'Copilot IA Gastronómico', desc: 'Asesor de maridaje, alérgenos y sugerencias de optimización.' },
    'tab-analytics': { title: 'Métricas & Desempeño', desc: 'Facturación acumulada, platos estrella y tiempos medios.' },
    'tab-kobe-engine': { title: 'KOBE Gastronomic Engine — Audit & Status', desc: 'Auditoría inmutable con hash chain SHA-256 e integridad transaccional.' }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      buttons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(tab);
      if (targetPane) targetPane.classList.add('active');

      if (tab === 'tab-kobe-engine') {
        fetchKobeAudit();
      }

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

// ========================
// KOBE AUDIT TRAIL STREAM
// ========================
window.fetchKobeAudit = async function() {
  const container = document.getElementById('kobe-audit-stream');
  if (!container) return;

  try {
    const res = await fetch('/api/kobe/audit');
    const json = await res.json();

    if (!json.success || !json.ledger || json.ledger.length === 0) {
      container.innerHTML = `
        <div style="color: #94a3b8; font-style: italic;">
          🔒 El Ledger criptográfico está inicializado. Los eventos emitidos por órdenes y mozos aparecerán aquí en vivo con su hash SHA-256 encadenado.
        </div>
      `;
      return;
    }

    container.innerHTML = json.ledger.map((entry, idx) => `
      <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 8px 0;">
        <span style="color: #2a9d8f;">[#${idx + 1} ${entry.createdAt}]</span>
        <strong style="color: #e9c46a;"> ${entry.action}</strong>
        <span style="color: #94a3b8;"> (${entry.entityType} ID: ${entry.entityId})</span>
        <br>
        <span style="color: #64748b;">Prev Hash: ${entry.prevHash || 'ROOT_GENESIS'}</span>
        <br>
        <span style="color: #d4a373;">Hash SHA256: ${entry.hash}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<span style="color: #e76f51;">Error consultando Audit Ledger.</span>`;
  }
};

// ========================
// VISTA: STOCK & ESCÁNER DE LOTES
// ========================
function renderInventory() {
  const container = document.getElementById('inventory-table-container');
  if (!container) return;

  const lots = state.inventory || [];
  const lowStockCount = lots.filter(l => l.currentQuantity <= l.minStock).length;
  const totalValuation = lots.reduce((sum, l) => sum + (l.currentQuantity * (l.costPerUnit || 0)), 0);

  const statLow = document.getElementById('stat-low-stock');
  const statLots = document.getElementById('stat-total-lots');
  const statVal = document.getElementById('stat-stock-valuation');

  if (statLow) statLow.textContent = lowStockCount;
  if (statLots) statLots.textContent = lots.length;
  if (statVal) statVal.textContent = `$${Math.round(totalValuation).toLocaleString('es-AR')}`;

  if (lots.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No hay lotes de insumos registrados aún.</p>`;
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-color); color: var(--primary);">
          <th style="padding: 10px 8px;">Código / Lote</th>
          <th style="padding: 10px 8px;">Insumo</th>
          <th style="padding: 10px 8px;">Categoría</th>
          <th style="padding: 10px 8px;">Stock Disponible</th>
          <th style="padding: 10px 8px;">Vencimiento (FEFO)</th>
          <th style="padding: 10px 8px;">Proveedor</th>
          <th style="padding: 10px 8px; text-align: right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${lots.map(lot => {
          const isLow = lot.currentQuantity <= lot.minStock;
          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); ${isLow ? 'background: rgba(217,107,82,0.08);' : ''}">
              <td style="padding: 12px 8px;">
                <code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--accent-gold);">${lot.lotCode}</code>
                <div style="font-size: 0.75rem; color: #94a3b8;">EAN: ${lot.barcode}</div>
              </td>
              <td style="padding: 12px 8px; font-weight: 600;">${lot.name}</td>
              <td style="padding: 12px 8px; color: var(--text-muted);">${lot.category}</td>
              <td style="padding: 12px 8px;">
                <strong style="color: ${isLow ? 'var(--accent-red)' : 'var(--accent-green)'};">
                  ${lot.currentQuantity.toLocaleString('es-AR')} ${lot.unit}
                </strong>
                ${isLow ? '<span style="font-size: 0.72rem; color: var(--accent-red); display: block;">⚠️ Bajo Mínimo</span>' : ''}
              </td>
              <td style="padding: 12px 8px; color: #e9c46a;">${lot.expiryDate}</td>
              <td style="padding: 12px 8px; color: var(--text-muted);">${lot.supplierName || '-'}</td>
              <td style="padding: 12px 8px; text-align: right;">
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="adjustStockPrompt('${lot.id}')">⚖️ Ajustar</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

window.adjustStockPrompt = async function(lotId) {
  const deltaStr = prompt('Ingrese cantidad para sumar (+) o restar (-) al stock (en unidad del lote):');
  if (!deltaStr) return;
  const delta = Number(deltaStr);
  if (isNaN(delta)) return alert('Cantidad inválida');

  const reason = prompt('Motivo del ajuste (ej: "Merma de cocina", "Ajuste de inventario", "Uso Josper"):') || 'Ajuste manual';

  try {
    const res = await fetch(`/api/inventory/${lotId}/adjust`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason })
    });
    if (res.ok) {
      await fetchInventory();
      renderInventory();
    }
  } catch (err) {
    alert('Error al ajustar stock');
  }
};

// ========================
// ESCÁNER DE CÓDIGO DE BARRAS
// ========================
function setupInventoryEvents() {
  const btnScan = document.getElementById('btn-scan-barcode');
  const inputScan = document.getElementById('scanner-input');
  const btnSimulate = document.getElementById('btn-simulate-camera-scan');

  const performScan = async (code) => {
    if (!code) return;
    const banner = document.getElementById('scanner-result-banner');
    try {
      const res = await fetch(`/api/inventory/scan/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const item = json.data;
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `
            <strong>✅ Insumo Escaneado con Éxito:</strong> ${item.name} (${item.lotCode})<br>
            <span>Stock Actual: <strong>${item.currentQuantity} ${item.unit}</strong> | Vencimiento: ${item.expiryDate} | Proveedor: ${item.supplierName}</span>
          `;
        }
      } else {
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `<span style="color: var(--accent-red);">❌ Código ${code} no encontrado en base de datos.</span>`;
        }
      }
    } catch (e) {
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<span style="color: var(--accent-red);">Error al consultar escáner.</span>`;
      }
    }
  };

  if (btnScan && inputScan) {
    btnScan.addEventListener('click', () => performScan(inputScan.value.trim()));
    inputScan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performScan(inputScan.value.trim());
    });
  }

  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      // Simular selección aleatoria de un lote existente
      const lots = state.inventory || [];
      if (lots.length > 0) {
        const sample = lots[Math.floor(Math.random() * lots.length)];
        if (inputScan) inputScan.value = sample.barcode;
        performScan(sample.barcode);
      } else {
        alert('No hay lotes registrados para simular');
      }
    });
  }

  // Modal Nuevo Lote
  const btnOpenLot = document.getElementById('btn-open-new-lot-modal');
  const modalLot = document.getElementById('modal-lot');
  const closeLot = document.getElementById('modal-lot-close');
  const cancelLot = document.getElementById('btn-cancel-lot');
  const formLot = document.getElementById('form-lot');

  if (btnOpenLot && modalLot) {
    btnOpenLot.addEventListener('click', () => {
      // Poblar select de proveedores
      const suppSelect = document.getElementById('lot-supplier-select');
      if (suppSelect) {
        suppSelect.innerHTML = (state.suppliers || []).map(s => `
          <option value="${s.id}">${s.name} (${s.category})</option>
        `).join('');
      }
      modalLot.classList.add('active');
    });
  }

  const closeLotModal = () => modalLot?.classList.remove('active');
  if (closeLot) closeLot.addEventListener('click', closeLotModal);
  if (cancelLot) cancelLot.addEventListener('click', closeLotModal);

  if (formLot) {
    formLot.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('lot-name').value,
        barcode: document.getElementById('lot-barcode').value,
        category: document.getElementById('lot-category').value,
        currentQuantity: Number(document.getElementById('lot-quantity').value),
        unit: document.getElementById('lot-unit').value,
        expiryDate: document.getElementById('lot-expiry').value,
        minStock: Number(document.getElementById('lot-min-stock').value),
        supplierId: document.getElementById('lot-supplier-select').value
      };

      try {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          formLot.reset();
          closeLotModal();
          await fetchInventory();
          renderInventory();
        }
      } catch (err) {
        alert('Error al registrar lote');
      }
    });
  }
}

// ========================
// VISTA: PROVEEDORES
// ========================
function renderSuppliers() {
  const container = document.getElementById('suppliers-grid');
  if (!container) return;

  const suppliers = state.suppliers || [];
  if (suppliers.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No hay proveedores registrados aún.</p>`;
    return;
  }

  container.innerHTML = suppliers.map(s => `
    <div class="glass-box" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 3px solid var(--primary);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${s.name}</h4>
          <span style="color: #e9c46a; font-size: 0.85rem;">⭐ ${s.rating || '5.0'}</span>
        </div>
        <p style="color: var(--primary); font-size: 0.85rem; margin: 4px 0 10px 0;">${s.category}</p>
        
        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
          <div><strong>CUIT:</strong> ${s.cuit}</div>
          <div><strong>Contacto:</strong> ${s.contact || 'No especificado'}</div>
          <div><strong>Teléfono:</strong> <a href="tel:${s.phone}" style="color: var(--text-main);">${s.phone}</a></div>
          <div><strong>Email:</strong> <a href="mailto:${s.email}" style="color: var(--text-main);">${s.email}</a></div>
          <div><strong>Días de Entrega:</strong> ${s.deliveryDays}</div>
        </div>
      </div>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.8rem; color: var(--accent-green);">● Homologado KOBE</span>
        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="alert('Generando orden de abastecimiento para ${s.name}...')">📦 Pedir Insumos</button>
      </div>
    </div>
  `).join('');
}

function setupSupplierEvents() {
  const btnOpen = document.getElementById('btn-open-new-supplier-modal');
  const modal = document.getElementById('modal-supplier');
  const closeBtn = document.getElementById('modal-supplier-close');
  const cancelBtn = document.getElementById('btn-cancel-supplier');
  const form = document.getElementById('form-supplier');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }

  const closeModal = () => modal?.classList.remove('active');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('supp-name').value,
        cuit: document.getElementById('supp-cuit').value,
        category: document.getElementById('supp-category').value,
        contact: document.getElementById('supp-contact').value,
        phone: document.getElementById('supp-phone').value,
        email: document.getElementById('supp-email').value,
        deliveryDays: document.getElementById('supp-delivery').value
      };

      try {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          form.reset();
          closeModal();
          await fetchSuppliers();
          renderSuppliers();
        }
      } catch (err) {
        alert('Error al registrar proveedor');
      }
    });
  }
}

// ========================
// GESTIÓN DE CARTA (MODIFICACIONES DE MENÚ)
// ========================
function setupMenuManagementEvents() {
  const btnOpenDish = document.getElementById('btn-open-new-dish-modal');
  const modalDish = document.getElementById('modal-dish');
  const closeDish = document.getElementById('modal-dish-close');
  const cancelDish = document.getElementById('btn-cancel-dish');
  const formDish = document.getElementById('form-dish');
  const modalTitle = document.getElementById('modal-dish-title');

  if (btnOpenDish && modalDish) {
    btnOpenDish.addEventListener('click', () => {
      document.getElementById('dish-id').value = '';
      if (formDish) formDish.reset();
      if (modalTitle) modalTitle.textContent = 'Agregar Plato a la Carta';
      modalDish.classList.add('active');
    });
  }

  const closeDishModal = () => modalDish?.classList.remove('active');
  if (closeDish) closeDish.addEventListener('click', closeDishModal);
  if (cancelDish) cancelDish.addEventListener('click', closeDishModal);

  if (formDish) {
    formDish.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dishId = document.getElementById('dish-id').value;
      const payload = {
        name: document.getElementById('dish-name').value,
        category: document.getElementById('dish-category').value,
        price: Number(document.getElementById('dish-price').value),
        timeMinutes: Number(document.getElementById('dish-time').value),
        allergens: document.getElementById('dish-allergens').value,
        description: document.getElementById('dish-description').value
      };

      try {
        const url = dishId ? `/api/menu/${dishId}` : '/api/menu';
        const method = dishId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          formDish.reset();
          closeDishModal();
          await fetchMenu();
          renderMenu();
        }
      } catch (err) {
        alert('Error al guardar plato');
      }
    });
  }
}

window.openEditDishModal = function(dishId) {
  const item = state.menu.find(m => m.id === dishId);
  if (!item) return;

  const modalDish = document.getElementById('modal-dish');
  const modalTitle = document.getElementById('modal-dish-title');

  document.getElementById('dish-id').value = item.id;
  document.getElementById('dish-name').value = item.name;
  document.getElementById('dish-category').value = item.category;
  document.getElementById('dish-price').value = item.price;
  document.getElementById('dish-time').value = item.timeMinutes || 15;
  document.getElementById('dish-allergens').value = Array.isArray(item.allergens) ? item.allergens.join(', ') : (item.allergens || '');
  document.getElementById('dish-description').value = item.description || '';

  if (modalTitle) modalTitle.textContent = `Editar Plato: ${item.name}`;
  if (modalDish) modalDish.classList.add('active');
};

window.deleteDish = async function(dishId) {
  const item = state.menu.find(m => m.id === dishId);
  if (!item) return;

  if (!confirm(`¿Estás seguro de eliminar "${item.name}" de la carta?`)) return;

  try {
    const res = await fetch(`/api/menu/${dishId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchMenu();
      renderMenu();
    }
  } catch (err) {
    alert('Error al eliminar plato');
  }
};

