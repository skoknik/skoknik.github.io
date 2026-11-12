import { CATEGORY_TABS, FILAMENT_COLORS, PRODUCTS } from './data/catalog.js';
import { SPRINGS, Spring, initSpringsEngine } from './springs.js';
import {
  DELIVERY_PROVIDERS,
  FREE_SHIPPING_THRESHOLD,
  addOrUpdateCartItem,
  calculateCartTotals,
  filterAndSortProducts,
  formatPriceRub,
  formatRussianPhoneInput,
  getCircularCardOffset,
  getCircularIndex,
} from './utils/storeLogic.js';

// Состояние магазина
const newArrivals = PRODUCTS.slice(0, 4);
const cardColors = {};
const catalogCardColors = {};
for (const p of PRODUCTS) {
  cardColors[p.id] = p.defaultColorId;
  catalogCardColors[p.id] = p.defaultColorId;
}

let cartItems = [
  { productId: 'tf-vase-plisse-01', colorId: 'sunset-orange', quantity: 1 },
];
let promoCode = '';
let deliveryService = DELIVERY_PROVIDERS[0];
let catalogCategory = 'all';
let catalogQuery = '';

// Состояние мобильной круговой ленты
let carouselIndex = 0;
let dragRatio = 0;
let isDraggingCarousel = false;
const carouselDrag = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  stageWidth: 280,
  lockedHorizontal: null,
  didSwipe: false,
};

// Генерация параметрического SVG-рендера изделия
function renderParametricSvgHtml(silhouette, colorId, twistDeg = 35, uidPrefix = 'card') {
  const color = FILAMENT_COLORS.find((c) => c.id === colorId) || FILAMENT_COLORS[0];
  const uid = `${silhouette}-${color.id}-${uidPrefix}`;
  const isLightFilament = color.id === 'milk-travertine';
  const ribIndices = [-3, -2, -1, 0, 1, 2, 3];
  const twistOffset = (twistDeg / 90) * 26;
  const rxOuter = silhouette === 'organizer-wave' || silhouette === 'horeca-stand' ? 74 : 54;
  const rxInner = silhouette === 'organizer-wave' || silhouette === 'horeca-stand' ? 48 : 36;

  let botanicalsHtml = '';
  if (silhouette === 'vase-twisted') {
    botanicalsHtml = `
      <g stroke-linecap="round" fill="none">
        <path d="M158 68 Q142 30 126 14" stroke="oklch(0.55 0.04 75)" stroke-width="2.2" />
        <ellipse cx="124" cy="14" rx="5.5" ry="12" transform="rotate(-28 124 14)" fill="oklch(0.84 0.06 78)" />
        <path d="M164 68 Q178 28 192 18" stroke="oklch(0.52 0.05 148)" stroke-width="2" />
        <circle cx="182" cy="31" r="5.5" fill="oklch(0.68 0.07 150)" />
        <circle cx="193" cy="19" r="4.5" fill="oklch(0.72 0.07 150)" />
      </g>
    `;
  } else if (silhouette === 'planter-ribbed') {
    botanicalsHtml = `
      <g>
        <path d="M160 102 C130 74, 108 48, 128 34 C146 22, 162 60, 160 102 Z" fill="oklch(0.54 0.11 148)" />
        <path d="M162 100 C188 68, 214 50, 198 32 C182 18, 158 56, 162 100 Z" fill="oklch(0.61 0.12 150)" />
        <path d="M160 104 C152 64, 168 30, 160 20 C150 30, 148 66, 160 104 Z" fill="oklch(0.48 0.09 146)" />
      </g>
    `;
  }

  let shapeHtml = '';
  if (silhouette === 'vase-twisted') {
    const ribs = ribIndices
      .map((idx) => {
        const topX = 160 + idx * 9;
        const midX = 160 + idx * 14 + twistOffset * 0.6;
        const botX = 160 + idx * 9 - twistOffset * 0.35;
        return `<path d="M${topX} 65 C${midX} 116, ${midX - twistOffset * 0.5} 170, ${botX} 220" fill="none" stroke="${
          idx < 0 ? color.accentHighlight : color.shadowColor
        }" stroke-opacity="${isLightFilament ? 0.55 : 0.45}" stroke-width="1.6" />`;
      })
      .join('');
    shapeHtml = `
      <g>
        <path d="M126 60 C142 56, 178 56, 194 60 C206 94, 224 136, 206 184 C198 208, 188 221, 160 222 C132 221, 122 208, 114 184 C96 136, 114 94, 126 60 Z" fill="url(#body-${uid})" stroke="${
          isLightFilament ? 'oklch(0.78 0.02 80)' : 'none'
        }" stroke-width="0.8" />
        <ellipse cx="160" cy="60" rx="34" ry="7" fill="url(#inner-${uid})" />
        ${ribs}
      </g>
    `;
  } else if (silhouette === 'lamp-pleated') {
    const ribs = ribIndices
      .map(
        (idx) =>
          `<path d="M${160 + idx * 11} 56 C${160 + idx * 18 + twistOffset * 0.3} 108, ${
            160 + idx * 18 - twistOffset * 0.2
          } 146, ${160 + idx * 12} 181" fill="none" stroke="oklch(0.98 0.05 85 / 0.5)" stroke-width="1.5" />`
      )
      .join('');
    shapeHtml = `
      <g>
        <path d="M128 176 L192 176 L200 220 C180 225, 140 225, 120 220 Z" fill="oklch(0.26 0.01 286)" />
        <circle cx="160" cy="118" r="72" fill="url(#glow-${uid})" />
        <path d="M116 58 C136 50, 184 50, 204 58 C230 98, 232 148, 204 180 C178 186, 142 186, 116 180 C88 148, 90 98, 116 58 Z" fill="url(#body-${uid})" />
        <circle cx="160" cy="118" r="42" fill="url(#glow-${uid})" />
        ${ribs}
      </g>
    `;
  } else if (silhouette === 'planter-ribbed') {
    const lines = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
      .map(
        (idx) =>
          `<line x1="${160 + idx * 12.5}" y1="101" x2="${160 + idx * 11}" y2="202" stroke="${
            idx <= 0 ? color.accentHighlight : color.shadowColor
          }" stroke-opacity="0.5" stroke-width="2.2" />`
      )
      .join('');
    shapeHtml = `
      <g>
        <path d="M104 202 L216 202 L210 221 C184 226, 136 226, 110 221 Z" fill="oklch(0.28 0.01 286)" />
        <path d="M98 94 C132 88, 188 88, 222 94 L212 202 C182 208, 138 208, 108 202 Z" fill="url(#body-${uid})" />
        <ellipse cx="160" cy="94" rx="62" ry="9" fill="url(#inner-${uid})" />
        ${lines}
      </g>
    `;
  } else if (silhouette === 'vase-arch') {
    shapeHtml = `
      <g>
        <path fill-rule="evenodd" d="M106 112 C106 62, 214 62, 214 112 L214 220 C186 225, 134 225, 106 220 Z M142 126 C142 104, 178 104, 178 126 L178 194 C178 202, 142 202, 142 194 Z" fill="url(#body-${uid})" />
        <rect x="148" y="52" width="24" height="22" rx="5" fill="url(#body-${uid})" />
        <ellipse cx="160" cy="53" rx="12" ry="3.5" fill="url(#inner-${uid})" />
      </g>
    `;
  } else if (silhouette === 'organizer-wave') {
    shapeHtml = `
      <g>
        <path d="M92 102 C118 88, 156 92, 182 106 L182 216 L92 216 Z" fill="${color.shadowColor}" />
        <path d="M114 126 C146 112, 188 118, 218 130 L218 220 L114 220 Z" fill="url(#body-${uid})" />
        <path d="M84 166 C126 154, 194 156, 236 168 L230 222 C190 227, 130 227, 90 222 Z" fill="url(#body-${uid})" stroke="${color.accentHighlight}" stroke-width="1" />
      </g>
    `;
  } else if (silhouette === 'horeca-stand') {
    shapeHtml = `
      <g>
        <rect x="104" y="58" width="74" height="118" rx="6" fill="oklch(0.98 0.005 85)" stroke="oklch(0.82 0.01 286)" />
        <rect x="116" y="92" width="26" height="26" rx="3" fill="oklch(0.22 0.01 286)" />
        <line x1="116" y1="128" x2="164" y2="128" stroke="oklch(0.75 0.01 286)" stroke-width="2" />
        <path d="M88 146 C124 140, 196 140, 232 146 L226 220 C192 226, 128 226, 94 220 Z" fill="url(#body-${uid})" />
        <path d="M190 102 C202 99, 218 99, 228 102 L226 214 L190 214 Z" fill="url(#body-${uid})" stroke="${color.accentHighlight}" stroke-width="0.8" />
      </g>
    `;
  }

  return `
    <div class="parametric-stage" style="--filament-main: ${color.cssColor}; --filament-hi: ${color.accentHighlight}; --filament-sh: ${color.shadowColor};">
      <svg viewBox="0 0 320 260" role="img" aria-label="Изделие в оттенке ${color.name}" class="parametric-svg">
        <defs>
          <radialGradient id="bg-${uid}" cx="35%" cy="25%" r="75%">
            <stop offset="0%" stop-color="oklch(0.985 0.006 80)" />
            <stop offset="65%" stop-color="oklch(0.95 0.008 286)" />
            <stop offset="100%" stop-color="oklch(0.915 0.01 286)" />
          </radialGradient>
          <linearGradient id="body-${uid}" x1="12%" y1="15%" x2="88%" y2="85%">
            <stop offset="0%" stop-color="${color.accentHighlight}" />
            <stop offset="42%" stop-color="${color.cssColor}" />
            <stop offset="100%" stop-color="${color.shadowColor}" />
          </linearGradient>
          <linearGradient id="inner-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${color.shadowColor}" />
            <stop offset="100%" stop-color="${color.accentHighlight}" />
          </linearGradient>
          <radialGradient id="glow-${uid}" cx="50%" cy="48%" r="52%">
            <stop offset="0%" stop-color="oklch(0.95 0.14 82)" stop-opacity="0.95" />
            <stop offset="55%" stop-color="oklch(0.82 0.18 60)" stop-opacity="0.55" />
            <stop offset="100%" stop-color="${color.cssColor}" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="260" rx="14" fill="url(#bg-${uid})" />
        <path d="M0 214 L320 214 L320 260 L0 260 Z" fill="oklch(0.925 0.007 286 / 0.65)" />
        <line x1="24" y1="214" x2="296" y2="214" stroke="oklch(0.84 0.01 286)" stroke-width="1" />
        <ellipse cx="160" cy="223" rx="${rxOuter}" ry="10" fill="oklch(0.18 0.01 286 / 0.16)" />
        <ellipse cx="164" cy="223" rx="${rxInner}" ry="5.5" fill="oklch(0.18 0.01 286 / 0.22)" />
        ${botanicalsHtml}
        ${shapeHtml}
      </svg>
    </div>
  `;
}

// Генерация HTML карточки товара
function renderProductCardHtml(product, activeColorId, uidPrefix, showShortColorLabel = true) {
  const activeColor =
    FILAMENT_COLORS.find((c) => c.id === activeColorId) || FILAMENT_COLORS[0];
  const isDiscountBadge = Boolean(product.tag && product.tag.startsWith('Скидка'));

  const badgeHtml = product.tag
    ? `<span class="meta-badge ${
        isDiscountBadge ? 'meta-badge--azure' : 'meta-badge--brand'
      } product-card-badge-overlay">${product.tag}</span>`
    : '';

  const swatchesHtml = product.availableColorIds
    .map((cId) => {
      const sw = FILAMENT_COLORS.find((f) => f.id === cId);
      if (!sw) return '';
      return `
        <button
          type="button"
          class="swatch-btn"
          data-spring="fast"
          data-swatch-color="${cId}"
          data-product-id="${product.id}"
          aria-pressed="${activeColorId === cId ? 'true' : 'false'}"
          aria-label="${product.name} — цвет ${sw.name}"
          style="background-color: ${sw.cssColor}"
        ></button>
      `;
    })
    .join('');

  const swatchesBlockHtml = showShortColorLabel
    ? `
      <div class="card-row-between" style="align-items: center;" data-swatch-row>
        <div class="filament-swatches" role="group" aria-label="Выбор цвета для ${product.name}">
          ${swatchesHtml}
        </div>
        <span class="inline-meta" data-color-short>${activeColor.shortName}</span>
      </div>
    `
    : `
      <div class="filament-swatches" role="group" aria-label="Цвет для ${product.name}" data-swatch-row>
        ${swatchesHtml}
      </div>
    `;

  const oldPriceHtml = product.oldPrice
    ? `<span class="data-price-strike">${formatPriceRub(product.oldPrice)}</span>`
    : '';

  return `
    <article class="card product-card" data-spring="default" data-product-card="${product.id}" data-uid-prefix="${uidPrefix}">
      <div class="product-card-visual-wrap">
        ${badgeHtml}
        <div data-visual-slot>
          ${renderParametricSvgHtml(product.silhouette, activeColorId, product.twistDeg, uidPrefix)}
        </div>
      </div>
      <h3 class="meta-card-title">${product.name}</h3>
      <p class="prose-compact line-clamp-2">${product.shortDescription}</p>
      <div class="product-card-footer">
        ${swatchesBlockHtml}
        <div class="divider"></div>
        <div class="product-card-actions-row">
          <div class="cluster" style="--cluster-gap: 0.4rem; align-items: baseline;">
            <span class="data-price-md">${formatPriceRub(product.price)}</span>
            ${oldPriceHtml}
          </div>
          <button
            type="button"
            class="btn btn--primary btn-cart-add"
            data-spring="fast"
            data-add-to-cart="${product.id}"
            data-added="false"
          >
            <span class="btn-cart-label-default">В корзину</span>
            <span class="btn-cart-label-added" aria-hidden="true">Добавлено</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

// Обновление выбранного оттенка на карточке без пересоздания DOM-узла карточки
function updateCardColorInDom(cardEl, product, nextColorId) {
  const uidPrefix = cardEl.dataset.uidPrefix || 'card';
  const activeColor =
    FILAMENT_COLORS.find((c) => c.id === nextColorId) || FILAMENT_COLORS[0];

  const visualSlot = cardEl.querySelector('[data-visual-slot]');
  if (visualSlot) {
    visualSlot.innerHTML = renderParametricSvgHtml(
      product.silhouette,
      nextColorId,
      product.twistDeg,
      uidPrefix
    );
  }

  const shortEl = cardEl.querySelector('[data-color-short]');
  if (shortEl) {
    shortEl.textContent = activeColor.shortName;
  }

  cardEl.querySelectorAll('[data-swatch-color]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.swatchColor === nextColorId ? 'true' : 'false'
    );
  });
}

// Первичная отрисовка секции «Новинки» (десктопная сетка + мобильная круговая свайп-лента)
function renderNewArrivals() {
  const gridEl = document.getElementById('new-arrivals-grid');
  const stageEl = document.getElementById('carousel-peek-stage');

  if (gridEl) {
    gridEl.innerHTML = newArrivals
      .map((product, i) =>
        renderProductCardHtml(product, cardColors[product.id], `grid-${i}`, true)
      )
      .join('');
  }

  if (stageEl) {
    stageEl.innerHTML = newArrivals
      .map(
        (product, idx) => `
          <div
            class="carousel-peek-item"
            data-carousel-idx="${idx}"
            data-offset="0"
            data-dragging="false"
          >
            ${renderProductCardHtml(product, cardColors[product.id], `mob-${idx}`, true)}
          </div>
        `
      )
      .join('');
  }

  updateCarouselPositions();
}

// Обновление трансформаций мобильной круговой ленты
function updateCarouselPositions() {
  const stageEl = document.getElementById('carousel-peek-stage');
  if (!stageEl) return;

  const items = stageEl.querySelectorAll('.carousel-peek-item');
  items.forEach((itemEl) => {
    const idx = Number(itemEl.dataset.carouselIdx || 0);
    const baseOffset = getCircularCardOffset(idx, carouselIndex, newArrivals.length);
    const continuousOffset = baseOffset + dragRatio;
    const absOffset = Math.abs(continuousOffset);

    // Расстояние между карточками чуть больше (104%), а соседние карточки меньше основной ровно на 5% (scale 0.95)
    const translatePct = continuousOffset * 104;
    const scaleVal = Math.max(0.85, 1 - Math.min(2, absOffset) * 0.05);
    const opacityVal =
      absOffset <= 1.25
        ? Math.max(0.45, 1 - absOffset * 0.36)
        : Math.max(0, 1 - (absOffset - 1.1) * 1.4);
    const zIndexVal = Math.round(10 - absOffset * 4);

    itemEl.dataset.offset = String(baseOffset);
    itemEl.dataset.dragging = isDraggingCarousel ? 'true' : 'false';
    itemEl.style.transform = `translate3d(${translatePct.toFixed(2)}%, 0, 0) scale(${scaleVal.toFixed(3)})`;
    itemEl.style.opacity = String(opacityVal);
    itemEl.style.zIndex = String(zIndexVal);
    itemEl.style.pointerEvents = absOffset > 1.35 ? 'none' : 'auto';
  });
}

// Отрисовка корзины (#cart-drawer) и счётчика в шапке
function renderCart() {
  const totals = calculateCartTotals(cartItems, PRODUCTS, promoCode);

  const countBadge = document.getElementById('cart-count');
  const drawerBadge = document.getElementById('cart-drawer-count');
  const headerBtn = document.getElementById('cart-header-btn');
  if (countBadge) countBadge.textContent = String(totals.totalCount);
  if (drawerBadge) drawerBadge.textContent = String(totals.totalCount);
  if (headerBtn) {
    headerBtn.setAttribute('aria-label', `Корзина, товаров: ${totals.totalCount}`);
  }

  const shippingBanner = document.getElementById('cart-shipping-banner');
  if (shippingBanner) {
    if (totals.freeShippingRemaining > 0) {
      shippingBanner.innerHTML = `
        <p class="prose-compact">
          До бесплатной доставки (Ozon, Яндекс, СДЭК) осталось
          <strong class="tabular-nums text-accent-secondary">${formatPriceRub(totals.freeShippingRemaining)}</strong>
          — бесплатно от ${formatPriceRub(FREE_SHIPPING_THRESHOLD)}.
        </p>
      `;
    } else {
      shippingBanner.innerHTML = `
        <p class="prose-compact text-success">
          Бесплатная доставка через Ozon, Яндекс или СДЭК активирована (заказ от 3 000 ₽).
        </p>
      `;
    }
  }

  const emptyStateEl = document.getElementById('cart-empty-state');
  const filledContentEl = document.getElementById('cart-filled-content');
  const itemsListEl = document.getElementById('cart-items-list');
  const promoStatusEl = document.getElementById('cart-promo-status');
  const summaryEl = document.getElementById('cart-totals-summary');

  if (totals.items.length === 0) {
    if (emptyStateEl) emptyStateEl.hidden = false;
    if (filledContentEl) filledContentEl.hidden = true;
    return;
  }

  if (emptyStateEl) emptyStateEl.hidden = true;
  if (filledContentEl) filledContentEl.hidden = false;

  if (itemsListEl) {
    itemsListEl.innerHTML = totals.items
      .map(
        (item) => `
          <div
            style="padding: var(--space-sm); border-radius: var(--radius-md); background-color: var(--color-surface-card); border: 0.0625rem solid var(--color-border-subtle);"
            class="stack"
          >
            <div class="card-row-between">
              <div class="heading-group">${item.product.name}</div>
              <div class="data-price-md">${formatPriceRub(item.lineTotal)}</div>
            </div>
            <div class="card-row-between" style="align-items: center;">
              <div class="inline-meta">
                <span style="width: 0.75rem; height: 0.75rem; border-radius: var(--radius-full); background-color: ${item.colorCss}; display: inline-block; border: 0.0625rem solid var(--color-border-strong);"></span>
                <span>Цвет: ${item.colorName}</span>
              </div>
              <div class="cluster" style="--cluster-gap: 0.35rem;">
                <button
                  type="button"
                  class="btn btn--surface btn--icon"
                  data-spring="fast"
                  style="padding: 0.35em 0.6em;"
                  data-cart-qty="-1"
                  data-product-id="${item.productId}"
                  data-color-id="${item.colorId}"
                  aria-label="Уменьшить количество ${item.product.name}"
                >−</button>
                <span class="data-metric" style="min-width: 1.5rem; text-align: center;">${item.quantity}</span>
                <button
                  type="button"
                  class="btn btn--surface btn--icon"
                  data-spring="fast"
                  style="padding: 0.35em 0.6em;"
                  data-cart-qty="1"
                  data-product-id="${item.productId}"
                  data-color-id="${item.colorId}"
                  aria-label="Увеличить количество ${item.product.name}"
                >+</button>
              </div>
            </div>
          </div>
        `
      )
      .join('');
  }

  if (promoStatusEl) {
    if (totals.appliedPromo) {
      promoStatusEl.hidden = false;
      promoStatusEl.textContent = `Промокод ${totals.appliedPromo} применён (−${formatPriceRub(totals.discountAmount)})`;
    } else {
      promoStatusEl.hidden = true;
      promoStatusEl.textContent = '';
    }
  }

  if (summaryEl) {
    const discountRow =
      totals.discountAmount > 0
        ? `
          <div class="card-row-between text-success">
            <span>Скидка:</span>
            <span class="tabular-nums">−${formatPriceRub(totals.discountAmount)}</span>
          </div>
        `
        : '';

    summaryEl.innerHTML = `
      <div class="card-row-between">
        <span class="text-muted">Сумма изделий:</span>
        <span class="tabular-nums">${formatPriceRub(totals.subtotal)}</span>
      </div>
      ${discountRow}
      <div class="card-row-between">
        <span class="text-muted">Доставка (${deliveryService}):</span>
        <span class="tabular-nums">${
          totals.shippingCost === 0 ? '0 ₽ (бесплатно)' : formatPriceRub(totals.shippingCost)
        }</span>
      </div>
      <div class="card-row-between" style="padding-top: 0.25rem;">
        <span class="heading-group">Итого:</span>
        <span class="data-price-md">${formatPriceRub(totals.finalTotal)}</span>
      </div>
    `;
  }
}

// Отрисовка модального окна полного каталога
function renderCatalogModal() {
  const tabsEl = document.getElementById('catalog-category-tabs');
  const gridEl = document.getElementById('catalog-modal-grid');

  if (tabsEl) {
    tabsEl.innerHTML = CATEGORY_TABS.map(
      (tab) => `
        <button
          type="button"
          class="ui-chip"
          data-spring="fast"
          data-catalog-tab="${tab.id}"
          aria-pressed="${catalogCategory === tab.id ? 'true' : 'false'}"
        >${tab.label}</button>
      `
    ).join('');
  }

  if (gridEl) {
    const items = filterAndSortProducts(PRODUCTS, {
      category: catalogCategory,
      query: catalogQuery,
      sortBy: 'featured',
    });

    gridEl.innerHTML = items
      .map((product, idx) =>
        renderProductCardHtml(
          product,
          catalogCardColors[product.id] || product.defaultColorId,
          `cat-${idx}`,
          false
        )
      )
      .join('');
  }
}

// Инициализация всего приложения после загрузки DOM
function initApp() {
  const headerEl = document.getElementById('site-header');
  const backdropEl = document.getElementById('site-backdrop');

  // 1. Первичная отрисовка карточек и корзины
  renderNewArrivals();
  renderCart();
  renderCatalogModal();

  // 2. Инициализация оригинального движка AOSP Springs (springs.js)
  initSpringsEngine(backdropEl);

  // 3. Пружины для модального окна «Личный кабинет» (плавное появление из центра + затемнение)
  const accountOverlayEl = document.getElementById('account-modal-overlay');
  const accountDialogEl = document.getElementById('account-modal-dialog');
  let isAccountModalOpen = false;
  let accountSpatialSpring = null;
  let accountEffectsSpring = null;

  if (accountOverlayEl && accountDialogEl) {
    accountOverlayEl.inert = true;

    accountSpatialSpring = new Spring(SPRINGS.default.spatial, 0, (v) => {
      const scaleVal = 0.84 + 0.16 * v;
      accountDialogEl.style.transform = `scale3d(${scaleVal.toFixed(4)}, ${scaleVal.toFixed(4)}, 1)`;
    });

    accountEffectsSpring = new Spring(SPRINGS.default.effects, 0, (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      const isVisible = clamped > 0.001;
      accountOverlayEl.style.opacity = clamped.toFixed(4);
      accountOverlayEl.style.visibility = isVisible ? 'visible' : 'hidden';
      accountDialogEl.style.opacity = clamped.toFixed(4);
    });
  }

  function setAccountModalOpen(nextOpen) {
    isAccountModalOpen = Boolean(nextOpen);
    if (!accountOverlayEl || !accountSpatialSpring || !accountEffectsSpring) return;
    accountOverlayEl.inert = !isAccountModalOpen;
    accountOverlayEl.setAttribute('aria-modal', String(isAccountModalOpen));
    accountOverlayEl.setAttribute('aria-hidden', String(!isAccountModalOpen));
    accountOverlayEl.style.pointerEvents = isAccountModalOpen ? 'auto' : 'none';
    accountSpatialSpring.to(isAccountModalOpen ? 1 : 0);
    accountEffectsSpring.to(isAccountModalOpen ? 1 : 0);
  }

  // 4. Пружина разъезжания соседних карточек на мобилке при увеличении центральной
  const carouselStageEl = document.getElementById('carousel-peek-stage');
  const carouselSpreadSpring = new Spring(SPRINGS.default.spatial, 0, (v) => {
    carouselStageEl?.style.setProperty('--carousel-spread', v.toFixed(4));
  });

  if (carouselStageEl) {
    carouselStageEl.addEventListener('pointerover', (e) => {
      const itemEl = e.target.closest('.carousel-peek-item');
      if (itemEl && Number(itemEl.dataset.offset) === 0) {
        carouselSpreadSpring.to(1);
      }
    });

    carouselStageEl.addEventListener('pointerout', (e) => {
      const itemEl = e.target.closest('.carousel-peek-item');
      if (!itemEl) return;
      const related = e.relatedTarget;
      if (!related || !itemEl.contains(related)) {
        carouselSpreadSpring.to(0);
      }
    });
  }

  // 5. Обработчики свайпа для мобильной круговой ленты «Новинки»
  const carouselViewportEl = document.getElementById('carousel-peek-viewport');
  if (carouselViewportEl) {
    carouselViewportEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button')) return;

      const stageWidth = carouselViewportEl.offsetWidth * 0.78 || 260;
      carouselDrag.active = true;
      carouselDrag.pointerId = e.pointerId;
      carouselDrag.startX = e.clientX;
      carouselDrag.startY = e.clientY;
      carouselDrag.stageWidth = stageWidth;
      carouselDrag.lockedHorizontal = null;
      carouselDrag.didSwipe = false;
      carouselViewportEl.setPointerCapture?.(e.pointerId);
    });

    carouselViewportEl.addEventListener('pointermove', (e) => {
      if (!carouselDrag.active || (carouselDrag.pointerId !== null && e.pointerId !== carouselDrag.pointerId)) {
        return;
      }

      const dx = e.clientX - carouselDrag.startX;
      const dy = e.clientY - carouselDrag.startY;

      if (carouselDrag.lockedHorizontal === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        carouselDrag.lockedHorizontal = Math.abs(dx) >= Math.abs(dy);
        if (!carouselDrag.lockedHorizontal) {
          carouselDrag.active = false;
          isDraggingCarousel = false;
          dragRatio = 0;
          updateCarouselPositions();
          return;
        }
        carouselDrag.didSwipe = true;
        isDraggingCarousel = true;
      }

      if (carouselDrag.lockedHorizontal) {
        dragRatio = Math.max(-1.05, Math.min(1.05, dx / carouselDrag.stageWidth));
        updateCarouselPositions();
      }
    });

    const finishCarouselDrag = (e) => {
      if (!carouselDrag.active) return;
      carouselDrag.active = false;

      const dx = e.clientX - carouselDrag.startX;
      const ratio = dx / (carouselDrag.stageWidth || 260);
      isDraggingCarousel = false;
      dragRatio = 0;

      if (carouselDrag.lockedHorizontal) {
        if (ratio <= -0.16) {
          carouselIndex = getCircularIndex(carouselIndex, 1, newArrivals.length);
        } else if (ratio >= 0.16) {
          carouselIndex = getCircularIndex(carouselIndex, -1, newArrivals.length);
        }
      }
      updateCarouselPositions();
    };

    carouselViewportEl.addEventListener('pointerup', finishCarouselDrag);
    carouselViewportEl.addEventListener('pointercancel', finishCarouselDrag);
  }

  // 6. Делегирование кликов по всей странице
  const catalogModalOverlay = document.getElementById('catalog-modal-overlay');

  document.addEventListener('click', (e) => {
    const target = e.target;

    // Переключение оттенка на карточке товара
    const swatchBtn = target.closest('[data-swatch-color]');
    if (swatchBtn) {
      e.stopPropagation();
      const productId = swatchBtn.dataset.productId;
      const nextColorId = swatchBtn.dataset.swatchColor;
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product || !nextColorId) return;

      const inCatalogModal = Boolean(swatchBtn.closest('#catalog-modal-overlay'));
      if (inCatalogModal) {
        catalogCardColors[productId] = nextColorId;
        const cardEl = swatchBtn.closest('[data-product-card]');
        if (cardEl) updateCardColorInDom(cardEl, product, nextColorId);
      } else {
        cardColors[productId] = nextColorId;
        document
          .querySelectorAll(`#new-arrivals [data-product-card="${productId}"]`)
          .forEach((cardEl) => updateCardColorInDom(cardEl, product, nextColorId));
      }
      return;
    }

    // Добавление товара в корзину
    const addBtn = target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.stopPropagation();
      const productId = addBtn.dataset.addToCart;
      const inCatalogModal = Boolean(addBtn.closest('#catalog-modal-overlay'));
      const activeColorId = inCatalogModal
        ? catalogCardColors[productId]
        : cardColors[productId];

      cartItems = addOrUpdateCartItem(cartItems, productId, activeColorId, 1);
      renderCart();

      addBtn.setAttribute('data-added', 'true');
      const addedLabel = addBtn.querySelector('.btn-cart-label-added');
      if (addedLabel) addedLabel.setAttribute('aria-hidden', 'false');

      window.setTimeout(() => {
        addBtn.setAttribute('data-added', 'false');
        if (addedLabel) addedLabel.setAttribute('aria-hidden', 'true');
      }, 1400);
      return;
    }

    // Клик по соседней карточке в мобильной ленте «Новинки»
    const carouselItem = target.closest('.carousel-peek-item');
    if (carouselItem && !target.closest('[data-swatch-row]')) {
      if (carouselDrag.didSwipe) {
        carouselDrag.didSwipe = false;
        return;
      }
      const idx = Number(carouselItem.dataset.carouselIdx || 0);
      const baseOffset = Number(carouselItem.dataset.offset || 0);
      if (baseOffset !== 0) {
        carouselSpreadSpring.to(0);
        carouselIndex = idx;
        updateCarouselPositions();
      }
      return;
    }

    // Изменение количества в корзине (− / +)
    const qtyBtn = target.closest('[data-cart-qty]');
    if (qtyBtn) {
      const productId = qtyBtn.dataset.productId;
      const colorId = qtyBtn.dataset.colorId;
      const delta = Number(qtyBtn.dataset.cartQty || 0);
      cartItems = addOrUpdateCartItem(cartItems, productId, colorId, delta);
      renderCart();
      return;
    }

    // Выбор службы доставки в корзине
    const providerBtn = target.closest('[data-delivery-provider]');
    if (providerBtn) {
      deliveryService = providerBtn.dataset.deliveryProvider;
      document.querySelectorAll('[data-delivery-provider]').forEach((chip) => {
        chip.setAttribute(
          'aria-pressed',
          chip.dataset.deliveryProvider === deliveryService ? 'true' : 'false'
        );
      });
      renderCart();
      return;
    }

    // Открытие и закрытие окна «Личный кабинет»
    if (target.closest('[data-open-account]')) {
      setAccountModalOpen(true);
      return;
    }
    if (target.closest('[data-close-account]') || target === accountOverlayEl) {
      setAccountModalOpen(false);
      return;
    }

    // Открытие и закрытие модального окна полного каталога (по кнопке «Смотреть каталог» в Hero и «02. Каталог» в меню)
    const openCatalogTrigger = target.closest('[data-open-catalog]');
    if (openCatalogTrigger) {
      e.preventDefault();
      if (catalogModalOverlay) {
        catalogModalOverlay.hidden = false;
      }
      return;
    }
    if (target.closest('[data-close-catalog]') || target === catalogModalOverlay) {
      if (catalogModalOverlay) {
        catalogModalOverlay.hidden = true;
      }
      return;
    }

    // Переключение вкладок категорий в модальном каталоге
    const tabBtn = target.closest('[data-catalog-tab]');
    if (tabBtn) {
      catalogCategory = tabBtn.dataset.catalogTab || 'all';
      renderCatalogModal();
    }
  });

  // 7. Промокод, поиск по каталогу и маска телефона +7 (900) 000-00-00
  const promoInput = document.getElementById('cart-promo-input');
  if (promoInput) {
    promoInput.addEventListener('input', (e) => {
      promoCode = e.target.value;
      renderCart();
    });
  }

  const catalogSearchInput = document.getElementById('catalog-search-input');
  if (catalogSearchInput) {
    catalogSearchInput.addEventListener('input', (e) => {
      catalogQuery = e.target.value;
      renderCatalogModal();
    });
  }

  document.querySelectorAll('input[type="tel"]').forEach((telInput) => {
    telInput.addEventListener('input', (e) => {
      e.target.value = formatRussianPhoneInput(e.target.value);
    });
  });

  // 8. Предотвращение перезагрузки страницы у форм (кнопки «Обсудить мою модель», «Связаться», «Оформить заказ», «Войти» ничего не делают)
  document.querySelectorAll('form').forEach((formEl) => {
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  });

  // Закрытие модалок по клавише Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isAccountModalOpen) setAccountModalOpen(false);
      if (catalogModalOverlay && !catalogModalOverlay.hidden) {
        catalogModalOverlay.hidden = true;
      }
    }
  });

  // 9. Пружина затемнения скроллбаров через effects-пружину и синхронизация высоты шапки
  const scrollbarColorSpring = new Spring(SPRINGS.default.effects, 0, (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    document.documentElement.style.setProperty('--sb-darken', clamped.toFixed(4));
  });

  const isPointerOnScrollbar = (clientX, clientY) => {
    if (clientX >= window.innerWidth - 14) return true;
    const scrollables = document.querySelectorAll('.drawer, .modal-dialog, textarea');
    for (const el of scrollables) {
      if (el.scrollHeight <= el.clientHeight) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (clientY < rect.top || clientY > rect.bottom) continue;

      const isLeftScrollbar = el.classList.contains('drawer--right');
      if (isLeftScrollbar) {
        if (clientX >= rect.left && clientX <= rect.left + 14) return true;
      } else {
        if (clientX >= rect.right - 14 && clientX <= rect.right) return true;
      }
    }
    return false;
  };

  let scrollIdleTimer = 0;
  let isHoveringScrollbar = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      const overSb = isPointerOnScrollbar(e.clientX, e.clientY);
      if (overSb !== isHoveringScrollbar) {
        isHoveringScrollbar = overSb;
        scrollbarColorSpring.to(overSb ? 1 : 0);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'scroll',
    () => {
      scrollbarColorSpring.to(1);
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        if (!isHoveringScrollbar) {
          scrollbarColorSpring.to(0);
        }
      }, 320);
    },
    { passive: true, capture: true }
  );

  if (headerEl) {
    const syncOffset = () => {
      document.documentElement.style.setProperty(
        '--scroll-padding-top',
        `${headerEl.offsetHeight / 16}rem`
      );
    };
    syncOffset();
    const ro = new ResizeObserver(syncOffset);
    ro.observe(headerEl);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
