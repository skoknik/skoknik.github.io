import { FILAMENT_COLORS } from '../data/catalog.js';

export const FREE_SHIPPING_THRESHOLD = 3000;
export const STANDARD_SHIPPING_COST = 350;

export const DELIVERY_PROVIDERS = ['Ozon', 'Яндекс Доставка', 'СДЭК'];

export function formatPriceRub(value) {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
}

export function getCircularIndex(currentIndex, delta, length) {
  if (length <= 0) return 0;
  return ((currentIndex + delta) % length + length) % length;
}

export function getCircularCardOffset(cardIndex, activeIndex, length) {
  if (length <= 1) return 0;
  const raw = ((cardIndex - activeIndex) % length + length) % length;
  if (raw === 0) return 0;
  if (raw === 1) return 1;
  if (raw === length - 1) return -1;
  return raw <= Math.floor(length / 2) ? raw : raw - length;
}

export function filterAndSortProducts(products, criteria) {
  const normalizedQuery = (criteria.query || '').trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (criteria.category && criteria.category !== 'all' && product.category !== criteria.category) {
      return false;
    }
    if (criteria.colorFilterId && !product.availableColorIds.includes(criteria.colorFilterId)) {
      return false;
    }
    if (normalizedQuery.length > 0) {
      const haystack = `${product.name} ${product.shortDescription} ${product.categoryLabel} ${product.sku}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered];
  if (criteria.sortBy === 'price-asc') {
    sorted.sort((a, b) => a.price - b.price);
  } else if (criteria.sortBy === 'price-desc') {
    sorted.sort((a, b) => b.price - a.price);
  }
  return sorted;
}

export function addOrUpdateCartItem(currentItems, productId, colorId, delta) {
  const existingIndex = currentItems.findIndex(
    (item) => item.productId === productId && item.colorId === colorId
  );

  if (existingIndex === -1) {
    if (delta <= 0) return currentItems;
    return [...currentItems, { productId, colorId, quantity: delta }];
  }

  const updated = [...currentItems];
  const nextQty = updated[existingIndex].quantity + delta;
  if (nextQty <= 0) {
    updated.splice(existingIndex, 1);
  } else {
    updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
  }
  return updated;
}

export function calculateCartTotals(cartItems, products, rawPromoCode = '') {
  const enriched = [];
  let totalCount = 0;
  let subtotal = 0;

  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || item.quantity <= 0) continue;
    const color =
      FILAMENT_COLORS.find((c) => c.id === item.colorId) ||
      FILAMENT_COLORS.find((c) => c.id === product.defaultColorId) ||
      FILAMENT_COLORS[0];
    const lineTotal = product.price * item.quantity;
    totalCount += item.quantity;
    subtotal += lineTotal;
    enriched.push({
      ...item,
      product,
      colorName: color.name,
      colorCss: color.cssColor,
      lineTotal,
    });
  }

  const promo = rawPromoCode.trim().toUpperCase();
  let discountAmount = 0;
  let appliedPromo = null;

  if (subtotal > 0) {
    if (promo === 'TRENDY10' || promo === 'TRENDYFORM') {
      discountAmount = Math.round(subtotal * 0.1);
      appliedPromo = promo;
    } else if (promo === 'NSK' || promo === 'НОВОСИБИРСК') {
      discountAmount = Math.min(subtotal, 400);
      appliedPromo = promo;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingCost =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_COST;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal);
  const finalTotal = discountedSubtotal + shippingCost;

  return {
    items: enriched,
    totalCount,
    subtotal,
    discountAmount,
    appliedPromo,
    shippingCost,
    freeShippingRemaining,
    finalTotal,
  };
}

export function formatRussianPhoneInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';

  let subscriber = digits;
  if (digits[0] === '7' || digits[0] === '8') {
    subscriber = digits.slice(1, 11);
  } else {
    subscriber = digits.slice(0, 10);
  }

  if (subscriber.length === 0) {
    const trimmed = String(raw || '').trim();
    if (trimmed === '7' || trimmed === '8') {
      return '+7 (';
    }
    return '';
  }

  let formatted = `+7 (${subscriber.slice(0, 3)}`;
  if (subscriber.length > 3) {
    formatted += `) ${subscriber.slice(3, 6)}`;
  }
  if (subscriber.length > 6) {
    formatted += `-${subscriber.slice(6, 8)}`;
  }
  if (subscriber.length > 8) {
    formatted += `-${subscriber.slice(8, 10)}`;
  }

  return formatted;
}

export function validateOrderForm(input) {
  if (!input.customerName || input.customerName.trim().length < 2) {
    return { valid: false, error: 'Укажите имя (минимум 2 символа).' };
  }
  const digits = String(input.phone || '').replace(/\D/g, '');
  if (digits.length < 11) {
    return { valid: false, error: 'Введите полный номер телефона (+7 (900) 000-00-00).' };
  }
  return { valid: true };
}

export function validateCustomModelForm(input) {
  if (!input.ideaTitle || input.ideaTitle.trim().length < 3) {
    return { valid: false, error: 'Коротко опишите, какое изделие вы хотите создать.' };
  }
  if (!input.customerName || input.customerName.trim().length < 2) {
    return { valid: false, error: 'Укажите ваше имя.' };
  }
  const digits = String(input.contactInfo || '').replace(/\D/g, '');
  if (digits.length < 11) {
    return { valid: false, error: 'Введите полный номер телефона (+7 (900) 000-00-00).' };
  }
  return { valid: true };
}

export function validateB2BForm(input) {
  if (!input.companyName || input.companyName.trim().length < 2) {
    return { valid: false, error: 'Укажите название вашей компании, кафе или бренда.' };
  }
  if (!input.contactPerson || input.contactPerson.trim().length < 2) {
    return { valid: false, error: 'Укажите контактное лицо.' };
  }
  const digits = String(input.contactInfo || '').replace(/\D/g, '');
  if (digits.length < 11) {
    return { valid: false, error: 'Введите полный номер телефона (+7 (900) 000-00-00).' };
  }
  return { valid: true };
}
