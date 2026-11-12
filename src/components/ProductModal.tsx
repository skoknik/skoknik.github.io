import React, { useEffect, useState } from 'react';
import { FILAMENT_COLORS, Product } from '../data/catalog';
import { formatPriceRub } from '../utils/storeLogic';
import { ParametricRender } from './ParametricRender';

interface ProductModalProps {
  product: Product | null;
  initialColorId?: string;
  onClose: () => void;
  onAddToCart: (productId: string, colorId: string, quantity: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  initialColorId,
  onClose,
  onAddToCart,
}) => {
  const [selectedColorId, setSelectedColorId] = useState<string>(
    initialColorId || product?.defaultColorId || 'sunset-orange'
  );
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (product) {
      setSelectedColorId(initialColorId || product.defaultColorId);
      setQuantity(1);
    }
  }, [product, initialColorId]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const activeColor =
    FILAMENT_COLORS.find((c) => c.id === selectedColorId) || FILAMENT_COLORS[0];

  const handleBuy = () => {
    onAddToCart(product.id, selectedColorId, quantity);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
        <div className="card-row-between" style={{ alignItems: 'center' }}>
          <div className="cluster" style={{ '--cluster-gap': '0.45rem' } as React.CSSProperties}>
            <span className="meta-breadcrumb">{product.categoryLabel}</span>
            <span className="meta-breadcrumb" aria-hidden="true">·</span>
            <span className="data-code text-muted">{product.sku}</span>
          </div>
          <button
            type="button"
            className="btn btn--surface btn--icon"
            data-spring="fast"
            onClick={onClose}
            aria-label="Закрыть окно товара"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="modal-split">
          <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
            <ParametricRender
              silhouette={product.silhouette}
              colorId={selectedColorId}
              twistDeg={product.twistDeg}
            />
          </div>

          <div className="stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
            <div className="stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <h2 id="modal-product-title" className="heading-section">
                {product.name}
              </h2>
              <div className="cluster" style={{ alignItems: 'baseline' }}>
                <span className="data-price-lg">{formatPriceRub(product.price)}</span>
                {product.oldPrice && (
                  <span className="data-price-strike">{formatPriceRub(product.oldPrice)}</span>
                )}
              </div>
            </div>

            <p className="prose-compact">{product.fullDescription}</p>

            <div className="stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <div className="card-row-between">
                <span className="ui-label">Цвет изделия:</span>
                <span className="prose-compact text-primary">
                  {activeColor.name}
                </span>
              </div>
              <div className="filament-swatches" role="group" aria-label="Выбор цвета изделия">
                {product.availableColorIds.map((cId) => {
                  const swatch = FILAMENT_COLORS.find((f) => f.id === cId);
                  if (!swatch) return null;
                  const isSelected = cId === selectedColorId;
                  return (
                    <button
                      key={cId}
                      type="button"
                      className="swatch-btn"
                      data-spring="fast"
                      aria-pressed={isSelected}
                      aria-label={`Выбрать цвет ${swatch.name}`}
                      style={{ backgroundColor: swatch.cssColor }}
                      onClick={() => setSelectedColorId(cId)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="divider" />

            <dl
              className="stack"
              style={{ '--stack-gap': 'var(--space-2xs)', fontSize: 'var(--step--1)' } as React.CSSProperties}
            >
              <div className="card-row-between">
                <dt className="text-muted">Размеры:</dt>
                <dd className="data-metric">{product.dimensions}</dd>
              </div>
              <div className="card-row-between">
                <dt className="text-muted">Фактура:</dt>
                <dd>{activeColor.finish}</dd>
              </div>
              <div className="card-row-between">
                <dt className="text-muted">Особенности:</dt>
                <dd className="text-secondary">{product.careNote}</dd>
              </div>
              <div className="card-row-between">
                <dt className="text-muted">Доставка:</dt>
                <dd className="text-secondary">Ozon, Яндекс, СДЭК (бесплатно от 3 000 ₽)</dd>
              </div>
            </dl>

            <div className="cluster" style={{ '--cluster-gap': 'var(--space-sm)' } as React.CSSProperties}>
              <div className="cluster" style={{ '--cluster-gap': '0.35rem' } as React.CSSProperties}>
                <button
                  type="button"
                  className="btn btn--surface btn--icon"
                  data-spring="fast"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Уменьшить количество"
                >
                  −
                </button>
                <span className="data-metric" style={{ minWidth: '2rem', textAlign: 'center' }}>
                  {quantity} шт.
                </span>
                <button
                  type="button"
                  className="btn btn--surface btn--icon"
                  data-spring="fast"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                data-spring="fast"
                style={{ flex: '1 1 12rem' }}
                onClick={handleBuy}
              >
                В корзину — {formatPriceRub(product.price * quantity)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
