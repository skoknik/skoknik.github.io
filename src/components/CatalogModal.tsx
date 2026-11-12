import React, { useEffect, useState } from 'react';
import {
  CATEGORY_TABS,
  FILAMENT_COLORS,
  PRODUCTS,
  ProductCategory,
} from '../data/catalog';
import { filterAndSortProducts, formatPriceRub } from '../utils/storeLogic';
import { ParametricRender } from './ParametricRender';

interface CatalogModalProps {
  isOpen: boolean;
  initialCategory?: ProductCategory;
  onClose: () => void;
  onAddToCart: (productId: string, colorId: string) => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  initialCategory = 'all',
  onClose,
  onAddToCart,
}) => {
  const [category, setCategory] = useState<ProductCategory>(initialCategory);
  const [query, setQuery] = useState('');
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const [cardColors, setCardColors] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of PRODUCTS) map[p.id] = p.defaultColorId;
    return map;
  });

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = filterAndSortProducts(PRODUCTS, {
    category,
    query,
    sortBy: 'featured',
  });

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-catalog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog--wide stack"
        style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}
      >
        <div className="card-row-between" style={{ alignItems: 'center' }}>
          <div>
            <div className="inline-meta">
              <span>Trendyform</span>
              <span aria-hidden="true">·</span>
              <span>Бесплатная доставка от 3 000 ₽ (Ozon, Яндекс, СДЭК)</span>
            </div>
            <h2 id="full-catalog-title" className="heading-section">
              Полный каталог изделий
            </h2>
          </div>
          <button
            type="button"
            className="btn btn--surface btn--icon"
            data-spring="fast"
            onClick={onClose}
            aria-label="Закрыть каталог"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="card-row-between" style={{ alignItems: 'center' }}>
          <div className="cluster" role="group" aria-label="Категории каталога">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="ui-chip"
                data-spring="fast"
                aria-pressed={category === tab.id}
                onClick={() => setCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="ui-input"
            style={{ maxWidth: '16rem' }}
            placeholder="Поиск по каталогу..."
            aria-label="Поиск по каталогу"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Сетка каталога с выравниванием карточек через CSS subgrid (5 строк) */}
        <div className="catalog-modal-grid">
          {items.map((product) => {
            const cId = cardColors[product.id] || product.defaultColorId;
            const isJustAdded = justAddedKey === `${product.id}-${cId}`;
            return (
              <article
                key={product.id}
                className="card product-card"
                data-spring="default"
              >
                {/* Строка 1 subgrid: Визуал */}
                <div className="product-card-visual-wrap">
                  {product.tag && (
                    <span
                      className={`meta-badge ${
                        product.tag.startsWith('Скидка')
                          ? 'meta-badge--azure'
                          : 'meta-badge--brand'
                      } product-card-badge-overlay`}
                    >
                      {product.tag}
                    </span>
                  )}
                  <ParametricRender
                    silhouette={product.silhouette}
                    colorId={cId}
                    twistDeg={product.twistDeg}
                  />
                </div>

                {/* Строка 2 subgrid: Заголовок */}
                <h3 className="meta-card-title">{product.name}</h3>

                {/* Строка 3 subgrid: Описание */}
                <p className="prose-compact line-clamp-2">{product.shortDescription}</p>

                {/* Строка 4 subgrid: Палитра + разделитель + цена и кнопка «В корзину» */}
                <div className="product-card-footer">
                  <div
                    className="filament-swatches"
                    role="group"
                    aria-label={`Цвет для ${product.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.availableColorIds.map((swId) => {
                      const sw = FILAMENT_COLORS.find((f) => f.id === swId);
                      if (!sw) return null;
                      return (
                        <button
                          key={swId}
                          type="button"
                          className="swatch-btn"
                          data-spring="fast"
                          aria-pressed={cId === swId}
                          aria-label={`${product.name} — цвет ${sw.name}`}
                          style={{ backgroundColor: sw.cssColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardColors((prev) => ({ ...prev, [product.id]: swId }));
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="divider" />

                  <div className="product-card-actions-row">
                    <div className="cluster" style={{ '--cluster-gap': '0.4rem', alignItems: 'baseline' } as React.CSSProperties}>
                      <span className="data-price-md">{formatPriceRub(product.price)}</span>
                      {product.oldPrice && (
                        <span className="data-price-strike">{formatPriceRub(product.oldPrice)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn-cart-add"
                      data-spring="fast"
                      data-added={isJustAdded ? 'true' : 'false'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product.id, cId);
                        const key = `${product.id}-${cId}`;
                        setJustAddedKey(key);
                        window.setTimeout(() => {
                          setJustAddedKey((curr) => (curr === key ? null : curr));
                        }, 1400);
                      }}
                    >
                      <span className="btn-cart-label-default">В корзину</span>
                      <span className="btn-cart-label-added" aria-hidden={!isJustAdded}>
                        Добавлено
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
