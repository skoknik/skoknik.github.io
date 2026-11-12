import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/catalog.js';
import {
  FREE_SHIPPING_THRESHOLD,
  addOrUpdateCartItem,
  calculateCartTotals,
  filterAndSortProducts,
  formatPriceRub,
  formatRussianPhoneInput,
  getCircularCardOffset,
  getCircularIndex,
  validateB2BForm,
  validateCustomModelForm,
  validateOrderForm,
} from './storeLogic.js';

test('getCircularIndex and getCircularCardOffset wrap around circularly in both directions', () => {
  assert.equal(getCircularIndex(0, -1, 4), 3);
  assert.equal(getCircularIndex(3, 1, 4), 0);
  assert.equal(getCircularIndex(1, 1, 4), 2);

  assert.equal(getCircularCardOffset(0, 0, 4), 0);
  assert.equal(getCircularCardOffset(1, 0, 4), 1);
  assert.equal(getCircularCardOffset(3, 0, 4), -1);
  assert.equal(getCircularCardOffset(2, 0, 4), 2);
});

test('filterAndSortProducts filters by category and search query', () => {
  const vases = filterAndSortProducts(PRODUCTS, {
    category: 'vases',
    query: '',
    sortBy: 'featured',
  });
  assert.equal(vases.length, 2);

  const searchResult = filterAndSortProducts(PRODUCTS, {
    category: 'all',
    query: 'автополивом',
    sortBy: 'featured',
  });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, 'tf-planter-kora-03');
});

test('calculateCartTotals enforces 3000 RUB free shipping threshold and promo codes', () => {
  assert.equal(FREE_SHIPPING_THRESHOLD, 3000);

  const cartBelow = [{ productId: 'tf-vase-plisse-01', colorId: 'sunset-orange', quantity: 1 }];
  const totalsBelow = calculateCartTotals(cartBelow, PRODUCTS, '');
  assert.equal(totalsBelow.subtotal, 2890);
  assert.equal(totalsBelow.freeShippingRemaining, 110);
  assert.ok(totalsBelow.shippingCost > 0);

  const cartAbove = addOrUpdateCartItem(cartBelow, 'tf-vase-plisse-01', 'sunset-orange', 1);
  const totalsAbove = calculateCartTotals(cartAbove, PRODUCTS, '');
  assert.equal(totalsAbove.shippingCost, 0);
  assert.equal(totalsAbove.freeShippingRemaining, 0);
});

test('formatRussianPhoneInput formats digits into +7 (900) 123-45-67 and strips non-digits', () => {
  assert.equal(formatRussianPhoneInput('9001234567'), '+7 (900) 123-45-67');
  assert.equal(formatRussianPhoneInput('abc'), '');

  let current = '';
  for (const ch of '9001234567') {
    current = formatRussianPhoneInput(current + ch);
  }
  assert.equal(current, '+7 (900) 123-45-67');
  assert.equal(formatRussianPhoneInput(current + 'xyz!@#'), '+7 (900) 123-45-67');
});

test('validation helpers validate custom model, B2B, and checkout forms', () => {
  assert.equal(
    validateCustomModelForm({
      ideaTitle: 'Ваза для сухоцветов 30 см',
      preferredColor: 'Молочный травертин',
      customerName: 'Антон',
      contactInfo: '+7 (900) 123-45-67',
    }).valid,
    true
  );

  assert.equal(
    validateOrderForm({
      customerName: 'Антон',
      phone: '+7 (900) 555-42-19',
      deliveryService: 'Ozon',
    }).valid,
    true
  );

  assert.equal(
    validateB2BForm({
      companyName: 'Кофейня Ботаника',
      contactPerson: 'Антон',
      contactInfo: '+7 (900) 123-45-67',
      projectNotes: '20 салфетниц',
    }).valid,
    true
  );

  assert.equal(formatPriceRub(3000), '3 000 ₽');
});
