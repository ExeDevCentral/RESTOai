const categoryImages = {
  Entradas: 'photo-1547592180-85f173990554',
  Principales: 'photo-1555939594-58d7cb561ad1',
  Pastas: 'photo-1473093295043-cdd812d0e601',
  Postres: 'photo-1488477181946-6428a0291777',
  Vinos: 'photo-1510812431401-41d2bd2722f3',
  Bebidas: 'photo-1513558161293-cdaf765edfd7'
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

export function filterAvailableMenu(menu, category = 'all', search = '') {
  const normalizedCategory = normalizeText(category);
  const normalizedSearch = normalizeText(search).trim();

  return menu.filter(item => {
    if (item.available === false) return false;
    if (normalizedCategory !== 'all' && normalizeText(item.category) !== normalizedCategory) return false;
    if (!normalizedSearch) return true;

    const searchableText = [item.name, item.description, ...(Array.isArray(item.allergens) ? item.allergens : [])]
      .map(normalizeText)
      .join(' ');
    return searchableText.includes(normalizedSearch);
  });
}

export function getTableLabel(search) {
  const table = new URLSearchParams(search).get('mesa');
  return table && /^[a-z]-\d{2,3}$/i.test(table) ? table.toUpperCase() : null;
}

function createMenuItem(item) {
  const article = document.createElement('article');
  article.className = 'dish';

  const photo = document.createElement('div');
  photo.className = 'dish-photo';
  const imageId = categoryImages[item.category] || categoryImages.Principales;
  const image = document.createElement('img');
  image.src = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=900&q=78`;
  image.alt = `Plato de la categoría ${item.category}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    photo.classList.add('dish-photo--fallback');
    image.remove();
  }, { once: true });
  photo.append(image);

  const content = document.createElement('div');
  content.className = 'dish-content';

  const category = document.createElement('p');
  category.className = 'dish-category';
  category.textContent = item.category || 'Carta';

  const title = document.createElement('h2');
  title.textContent = item.name || 'Plato';

  const description = document.createElement('p');
  description.className = 'dish-description';
  description.textContent = item.description || '';

  const footer = document.createElement('div');
  footer.className = 'dish-footer';
  const price = document.createElement('strong');
  const numericPrice = Number(item.price);
  price.textContent = Number.isFinite(numericPrice)
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(numericPrice)
    : 'Consultar';
  footer.append(price);

  const allergens = Array.isArray(item.allergens) ? item.allergens.filter(Boolean) : [];
  if (allergens.length > 0) {
    const allergenNote = document.createElement('p');
    allergenNote.className = 'dish-allergens';
    allergenNote.textContent = `Alérgenos declarados: ${allergens.join(', ')}`;
    footer.append(allergenNote);
  }

  content.append(category, title, description, footer);
  article.append(photo, content);
  return article;
}

function initializeGuestMenu() {
  const menuElement = document.getElementById('guest-menu-items');
  const categoryElement = document.getElementById('guest-menu-categories');
  const searchElement = document.getElementById('guest-menu-search');
  const statusElement = document.getElementById('guest-menu-status');
  const tableElement = document.getElementById('guest-menu-table');
  const countElement = document.getElementById('guest-menu-count');
  if (!menuElement || !categoryElement || !searchElement || !statusElement) return;

  const tableLabel = getTableLabel(window.location.search);
  if (tableElement && tableLabel) {
    tableElement.hidden = false;
    tableElement.textContent = `Mesa ${tableLabel}`;
  }

  let menuItems = [];
  let selectedCategory = 'all';

  const renderItems = () => {
    const visibleItems = filterAvailableMenu(menuItems, selectedCategory, searchElement.value);
    menuElement.replaceChildren(...visibleItems.map(createMenuItem));
    if (countElement) countElement.textContent = `${visibleItems.length} opciones`;
    statusElement.hidden = visibleItems.length > 0;
    statusElement.textContent = menuItems.length === 0
      ? 'La carta no está disponible en este momento.'
      : 'No encontramos platos con esos filtros.';
  };

  const renderCategories = () => {
    const categories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))];
    categoryElement.replaceChildren();

    for (const category of categories) {
      const button = document.createElement('button');
      const isAll = category === 'all';
      button.type = 'button';
      button.className = 'category-button';
      button.textContent = isAll ? 'Toda la carta' : category;
      button.setAttribute('aria-pressed', String(selectedCategory === category));
      if (selectedCategory === category) button.classList.add('is-active');
      button.addEventListener('click', () => {
        selectedCategory = category;
        renderCategories();
        renderItems();
      });
      categoryElement.append(button);
    }
  };

  searchElement.addEventListener('input', renderItems);

  const loadMenu = async () => {
    statusElement.hidden = false;
    statusElement.textContent = 'Cargando la carta…';
    try {
      const response = await fetch('/api/menu?available=true', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('menu_unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload?.data)) throw new Error('invalid_menu_response');
      menuItems = payload.data;
      renderCategories();
      renderItems();
    } catch {
      menuElement.replaceChildren();
      statusElement.hidden = false;
      statusElement.textContent = 'No pudimos cargar la carta. Revisa tu conexión y vuelve a intentarlo.';
      const retryButton = document.createElement('button');
      retryButton.type = 'button';
      retryButton.className = 'retry-button';
      retryButton.textContent = 'Volver a intentar';
      retryButton.addEventListener('click', loadMenu, { once: true });
      statusElement.append(' ', retryButton);
    }
  };

  loadMenu();
}

if (typeof document !== 'undefined') initializeGuestMenu();