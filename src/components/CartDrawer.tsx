import React, { useState } from 'react';
import {
  CartTotals,
  DELIVERY_PROVIDERS,
  FREE_SHIPPING_THRESHOLD,
  formatPriceRub,
  formatRussianPhoneInput,
  validateOrderForm,
} from '../utils/storeLogic';

interface CartDrawerProps {
  totals: CartTotals;
  promoInput: string;
  onPromoChange: (val: string) => void;
  onUpdateQty: (productId: string, colorId: string, delta: number) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  totals,
  promoInput,
  onPromoChange,
  onUpdateQty,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryService, setDeliveryService] = useState<string>(DELIVERY_PROVIDERS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    totalFormatted: string;
    customerName: string;
    deliveryService: string;
  } | null>(null);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <aside
      id="cart-drawer"
      className="drawer drawer--right"
      data-menu="default"
      aria-label="Корзина покупок"
    >
      <div className="drawer-mirror-reset">
        <div className="stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
          <div className="header-bar">
            <div className="cluster" style={{ '--cluster-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <span className="heading-modal">Корзина</span>
              <span className="meta-badge meta-badge--brand">{totals.totalCount}</span>
            </div>
            <button
              type="button"
              className="btn btn--surface btn--icon"
              data-spring="fast"
              data-menu-close
              aria-label="Закрыть корзину"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>

          {/* Индикатор бесплатной доставки от 3 000 ₽ с лазурным акцентом */}
          <div className="shipping-banner-azure">
            {totals.freeShippingRemaining > 0 ? (
              <p className="prose-compact">
                До бесплатной доставки (Ozon, Яндекс, СДЭК) осталось{' '}
                <strong className="tabular-nums text-accent-secondary">
                  {formatPriceRub(totals.freeShippingRemaining)}
                </strong>{' '}
                — бесплатно от {formatPriceRub(FREE_SHIPPING_THRESHOLD)}.
              </p>
            ) : (
              <p className="prose-compact text-success">
                Бесплатная доставка через Ozon, Яндекс или СДЭК активирована (заказ от 3 000 ₽).
              </p>
            )}
          </div>

          {confirmedOrder && totals.items.length === 0 && (
            <div
              className="stack"
              style={{
                '--stack-gap': 'var(--space-xs)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-card)',
                border: '0.0625rem solid var(--color-border-strong)',
              } as React.CSSProperties}
              role="status"
            >
              <div className="meta-status text-success">
                Заказ {confirmedOrder.orderNumber} оформлен
              </div>
              <p className="prose-compact">
                Спасибо, {confirmedOrder.customerName}! Мы свяжемся с вами для отправки службой{' '}
                <strong>{confirmedOrder.deliveryService}</strong>. Сумма:{' '}
                <strong>{confirmedOrder.totalFormatted}</strong>.
              </p>
              <button
                type="button"
                className="btn btn--surface"
                data-spring="fast"
                onClick={() => setConfirmedOrder(null)}
              >
                Новый заказ
              </button>
            </div>
          )}

          {totals.items.length === 0 && !confirmedOrder && (
            <div className="stack" style={{ '--stack-gap': 'var(--space-xs)', paddingBlock: 'var(--space-lg)' } as React.CSSProperties}>
              <div className="heading-group">В корзине пока пусто</div>
              <p className="prose-compact">
                Выберите понравившееся изделие в разделе «Новинки» или откройте полный каталог.
              </p>
            </div>
          )}

          {totals.items.length > 0 && (
            <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
              {totals.items.map((item) => (
                <div
                  key={`${item.productId}-${item.colorId}`}
                  style={{
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-card)',
                    border: '0.0625rem solid var(--color-border-subtle)',
                  }}
                  className="stack"
                >
                  <div className="card-row-between">
                    <div className="heading-group">{item.product.name}</div>
                    <div className="data-price-md">{formatPriceRub(item.lineTotal)}</div>
                  </div>

                  <div className="card-row-between" style={{ alignItems: 'center' }}>
                    <div className="inline-meta">
                      <span
                        style={{
                          width: '0.75rem',
                          height: '0.75rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: item.colorCss,
                          display: 'inline-block',
                          border: '0.0625rem solid var(--color-border-strong)',
                        }}
                      />
                      <span>Цвет: {item.colorName}</span>
                    </div>

                    <div className="cluster" style={{ '--cluster-gap': '0.35rem' } as React.CSSProperties}>
                      <button
                        type="button"
                        className="btn btn--surface btn--icon"
                        data-spring="fast"
                        style={{ padding: '0.35em 0.6em' }}
                        onClick={() => onUpdateQty(item.productId, item.colorId, -1)}
                        aria-label={`Уменьшить количество ${item.product.name}`}
                      >
                        −
                      </button>
                      <span className="data-metric" style={{ minWidth: '1.5rem', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn--surface btn--icon"
                        data-spring="fast"
                        style={{ padding: '0.35em 0.6em' }}
                        onClick={() => onUpdateQty(item.productId, item.colorId, 1)}
                        aria-label={`Увеличить количество ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Промокод без скобок */}
              <div className="stack" style={{ '--stack-gap': 'var(--space-2xs)' } as React.CSSProperties}>
                <label htmlFor="cart-promo-input" className="ui-label">
                  Промокод
                </label>
                <input
                  id="cart-promo-input"
                  type="text"
                  className="ui-input"
                  value={promoInput}
                  onChange={(e) => onPromoChange(e.target.value)}
                  placeholder="Введите промокод"
                />
                {totals.appliedPromo && (
                  <span className="prose-compact text-success">
                    Промокод {totals.appliedPromo} применён (−{formatPriceRub(totals.discountAmount)})
                  </span>
                )}
              </div>

              <div className="divider" />

              <div className="stack" style={{ '--stack-gap': '0.35rem', fontSize: 'var(--step--1)' } as React.CSSProperties}>
                <div className="card-row-between">
                  <span className="text-muted">Сумма изделий:</span>
                  <span className="tabular-nums">{formatPriceRub(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="card-row-between text-success">
                    <span>Скидка:</span>
                    <span className="tabular-nums">−{formatPriceRub(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="card-row-between">
                  <span className="text-muted">Доставка ({deliveryService}):</span>
                  <span className="tabular-nums">
                    {totals.shippingCost === 0 ? '0 ₽ (бесплатно)' : formatPriceRub(totals.shippingCost)}
                  </span>
                </div>
                <div className="card-row-between" style={{ paddingTop: '0.25rem' }}>
                  <span className="heading-group">Итого:</span>
                  <span className="data-price-md">{formatPriceRub(totals.finalTotal)}</span>
                </div>
              </div>

              <form
                onSubmit={handleCheckoutSubmit}
                className="stack"
                style={{ '--stack-gap': 'var(--space-xs)', paddingTop: 'var(--space-xs)' } as React.CSSProperties}
                noValidate
              >
                <div>
                  <span className="ui-label" style={{ marginBottom: 'var(--space-2xs)' }}>
                    Служба доставки
                  </span>
                  <div className="cluster" role="group" aria-label="Служба доставки">
                    {DELIVERY_PROVIDERS.map((provider) => {
                      const providerClass =
                        provider === 'Ozon'
                          ? 'delivery-chip--ozon'
                          : provider === 'Яндекс Доставка'
                            ? 'delivery-chip--yandex'
                            : 'delivery-chip--cdek';
                      return (
                        <button
                          key={provider}
                          type="button"
                          className={`ui-chip delivery-chip ${providerClass}`}
                          data-spring="fast"
                          aria-pressed={deliveryService === provider}
                          onClick={() => setDeliveryService(provider)}
                        >
                          {provider}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="order-name" className="ui-label">
                    Имя
                  </label>
                  <input
                    id="order-name"
                    type="text"
                    className="ui-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Антон"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="order-phone" className="ui-label">
                    Телефон
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    inputMode="numeric"
                    className="ui-input"
                    value={phone}
                    onChange={(e) => setPhone(formatRussianPhoneInput(e.target.value))}
                    placeholder="+7 (900) 000-00-00"
                    required
                  />
                </div>

                {formError && (
                  <p className="prose-compact text-danger" role="alert">
                    {formError}
                  </p>
                )}

                <button type="submit" className="btn btn--primary" data-spring="fast">
                  Оформить заказ
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
