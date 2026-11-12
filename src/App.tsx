import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2BSection } from './components/B2BSection';
import { CartDrawer } from './components/CartDrawer';
import { CatalogModal } from './components/CatalogModal';
import { ParametricRender } from './components/ParametricRender';
import { FILAMENT_COLORS, PRODUCTS, Product } from './data/catalog';
import { MenuController, SPRINGS, Spring, initSpringsEngine } from './springs.js';
import {
  CartItem,
  addOrUpdateCartItem,
  calculateCartTotals,
  formatPriceRub,
  formatRussianPhoneInput,
  getCircularCardOffset,
  getCircularIndex,
  validateCustomModelForm,
} from './utils/storeLogic';

const HERO_BG_IMAGE = '/src/assets/images/hero_trendyform_interior_1794492699021.jpg';
const ABOUT_BG_IMAGE = '/src/assets/images/about_trendyform_studio_1794492698580.jpg';
const BRAND_LOGO_IMAGE = '/assets/aistudio/logo_3e393985.png';

const RIBBON_TEXT = Array.from({ length: 24 }, () => 'TRENDYFORM').join('•') + '•';

type InfoDocKey = 'shipping' | 'terms' | 'privacy' | null;

export default function App() {
  const headerRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const menusMapRef = useRef<Map<string, MenuController> | null>(null);

  // 4 карточки для секции «Новинки»
  const newArrivals = useMemo(() => PRODUCTS.slice(0, 4), []);

  // Индекс активной карточки и свайп-состояние для мобильной круговой ленты
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [dragRatio, setDragRatio] = useState<number>(0);
  const [isDraggingCarousel, setIsDraggingCarousel] = useState<boolean>(false);
  const carouselDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    stageWidth: number;
    lockedHorizontal: boolean | null;
    didSwipe: boolean;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    stageWidth: 280,
    lockedHorizontal: null,
    didSwipe: false,
  });

  // Выбранные цвета внутри карточек
  const [cardColors, setCardColors] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of PRODUCTS) {
      initial[p.id] = p.defaultColorId;
    }
    return initial;
  });

  // Состояние формы «Заказать свою модель» (Раздел 3 — без выбора оттенка)
  const [customIdea, setCustomIdea] = useState('');
  const [customName, setCustomName] = useState('');
  const [customContact, setCustomContact] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSuccess, setCustomSuccess] = useState<string | null>(null);

  // Корзина
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { productId: 'tf-vase-plisse-01', colorId: 'sunset-orange', quantity: 1 },
  ]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);

  // Модальные окна: полный каталог, полная история «О нас», Личный кабинет, Документы покупателю
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [infoDocModal, setInfoDocModal] = useState<InfoDocKey>(null);
  const [accountPhone, setAccountPhone] = useState<string>('');

  const accountOverlayRef = useRef<HTMLDivElement | null>(null);
  const accountDialogRef = useRef<HTMLDivElement | null>(null);
  const accountSpringsRef = useRef<{ spatial: Spring; effects: Spring } | null>(null);
  const carouselStageRef = useRef<HTMLDivElement | null>(null);
  const carouselSpreadSpringRef = useRef<Spring | null>(null);

  // Плавное появление окна «Личный кабинет» из центра (spatial) и плавное затемнение сайта (effects)
  useEffect(() => {
    const overlayEl = accountOverlayRef.current;
    const dialogEl = accountDialogRef.current;
    if (!overlayEl || !dialogEl) return;

    overlayEl.inert = true;

    const spatial = new Spring(SPRINGS.default.spatial, 0, (v) => {
      const scaleVal = 0.84 + 0.16 * v;
      dialogEl.style.transform = `scale3d(${scaleVal.toFixed(4)}, ${scaleVal.toFixed(4)}, 1)`;
    });

    const effects = new Spring(SPRINGS.default.effects, 0, (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      const isVisible = clamped > 0.001;
      overlayEl.style.opacity = clamped.toFixed(4);
      overlayEl.style.visibility = isVisible ? 'visible' : 'hidden';
      dialogEl.style.opacity = clamped.toFixed(4);
    });

    accountSpringsRef.current = { spatial, effects };

    const spreadSpring = new Spring(SPRINGS.default.spatial, 0, (v) => {
      carouselStageRef.current?.style.setProperty('--carousel-spread', v.toFixed(4));
    });
    carouselSpreadSpringRef.current = spreadSpring;

    return () => {
      spatial.set(0);
      effects.set(0);
      spreadSpring.set(0);
    };
  }, []);

  useEffect(() => {
    const overlayEl = accountOverlayRef.current;
    const springs = accountSpringsRef.current;
    if (!overlayEl || !springs) return;

    overlayEl.inert = !isAccountModalOpen;
    overlayEl.style.pointerEvents = isAccountModalOpen ? 'auto' : 'none';
    springs.spatial.to(isAccountModalOpen ? 1 : 0);
    springs.effects.to(isAccountModalOpen ? 1 : 0);

    if (!isAccountModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAccountModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAccountModalOpen]);

  // Инициализация оригинального движка AOSP Springs (springs.js), пружины затемнения скроллбаров (effects) и высоты шапки
  useEffect(() => {
    menusMapRef.current = initSpringsEngine(backdropRef.current);

    // Пружина затемнения скроллбаров через effects-пружину (которая отвечает только за цвет/эффекты без spatial-колебаний)
    const scrollbarColorSpring = new Spring(SPRINGS.default.effects, 0, (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      document.documentElement.style.setProperty('--sb-darken', clamped.toFixed(4));
    });

    const isPointerOnScrollbar = (clientX: number, clientY: number): boolean => {
      if (clientX >= window.innerWidth - 14) return true;

      const scrollables = document.querySelectorAll<HTMLElement>(
        '.drawer, .modal-dialog, textarea'
      );
      for (const el of Array.from(scrollables)) {
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

    const onPointerMove = (e: PointerEvent) => {
      const overSb = isPointerOnScrollbar(e.clientX, e.clientY);
      if (overSb !== isHoveringScrollbar) {
        isHoveringScrollbar = overSb;
        scrollbarColorSpring.to(overSb ? 1 : 0);
      }
    };

    const onScrollPulse = () => {
      scrollbarColorSpring.to(1);
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        if (!isHoveringScrollbar) {
          scrollbarColorSpring.to(0);
        }
      }, 320);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScrollPulse, { passive: true, capture: true });

    const headerEl = headerRef.current;
    if (!headerEl) {
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('scroll', onScrollPulse, true);
        window.clearTimeout(scrollIdleTimer);
      };
    }
    const syncOffset = () => {
      document.documentElement.style.setProperty(
        '--scroll-padding-top',
        `${headerEl.offsetHeight / 16}rem`
      );
    };
    syncOffset();
    const ro = new ResizeObserver(syncOffset);
    ro.observe(headerEl);
    return () => {
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScrollPulse, true);
      window.clearTimeout(scrollIdleTimer);
    };
  }, []);

  const cartTotals = useMemo(
    () => calculateCartTotals(cartItems, PRODUCTS, promoCode),
    [cartItems, promoCode]
  );

  const handleAddToCart = (
    productId: string,
    colorId: string,
    qty = 1,
    openDrawerAfter = false
  ) => {
    setCartItems((prev) => addOrUpdateCartItem(prev, productId, colorId, qty));
    const key = `${productId}-${colorId}`;
    setJustAddedKey(key);
    window.setTimeout(() => {
      setJustAddedKey((curr) => (curr === key ? null : curr));
    }, 1400);
    if (openDrawerAfter) {
      menusMapRef.current?.get('cart-drawer')?.open();
    }
  };

  const handleUpdateCartQty = (productId: string, colorId: string, delta: number) => {
    setCartItems((prev) => addOrUpdateCartItem(prev, productId, colorId, delta));
  };

  const handleCustomModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Обработчики свайпа для мобильной круговой ленты «Новинки»
  const handleCarouselPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;

    const stageWidth = e.currentTarget.offsetWidth * 0.78 || 260;
    carouselDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      stageWidth,
      lockedHorizontal: null,
      didSwipe: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleCarouselPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = carouselDragRef.current;
    if (!st.active || (st.pointerId !== null && e.pointerId !== st.pointerId)) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (st.lockedHorizontal === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      st.lockedHorizontal = Math.abs(dx) >= Math.abs(dy);
      if (!st.lockedHorizontal) {
        st.active = false;
        setIsDraggingCarousel(false);
        setDragRatio(0);
        return;
      }
      st.didSwipe = true;
      setIsDraggingCarousel(true);
    }

    if (st.lockedHorizontal) {
      const ratio = Math.max(-1.05, Math.min(1.05, dx / st.stageWidth));
      setDragRatio(ratio);
    }
  };

  const finishCarouselDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = carouselDragRef.current;
    if (!st.active) return;
    st.active = false;

    const dx = e.clientX - st.startX;
    const ratio = dx / (st.stageWidth || 260);
    setIsDraggingCarousel(false);
    setDragRatio(0);

    if (st.lockedHorizontal) {
      if (ratio <= -0.16) {
        setCarouselIndex((idx) => getCircularIndex(idx, 1, newArrivals.length));
      } else if (ratio >= 0.16) {
        setCarouselIndex((idx) => getCircularIndex(idx, -1, newArrivals.length));
      }
    }
  };

  // Фирменная 3-слойная облачная эмблема:
  // 1) Сзади — оранжевое облако с чёрной обводкой
  // 2) Посередине — белое облако с чёрной обводкой и горизонтальными чёрными полосами
  // 3) Спереди — сплошное чёрное облако
  const renderBrandGlyph = (clipSuffix: string) => (
    <span className="brand-mark-glyph" aria-hidden="true">
      <svg width="36" height="26" viewBox="0 0 48 34" fill="none">
        <defs>
          <clipPath id={`mid-cloud-clip-${clipSuffix}`}>
            <path d="M9.5 27.5C6.2 27.5 3.6 25.1 3.6 22C3.6 19.1 5.9 16.8 8.9 16.6C10.1 12.6 13.9 9.7 18.5 9.7C23.4 9.7 27.5 12.9 28.6 17.2C29.1 17.1 29.6 17.1 30.2 17.1C34.2 17.1 37.4 20.1 37.4 23.8C37.4 25.9 35.7 27.5 33.4 27.5H9.5Z" />
          </clipPath>
        </defs>

        {/* 1. Задний слой: оранжевое облако с чёрной обводкой */}
        <path
          d="M12.5 22.5C9.2 22.5 6.6 20.1 6.6 17C6.6 14.1 8.9 11.8 11.9 11.6C13.1 6.2 17.8 2.4 23.4 2.4C29.3 2.4 34.2 6.5 35.4 12C36 11.9 36.6 11.8 37.2 11.8C41.5 11.8 45 15 45 19C45 21 43.3 22.5 41 22.5H12.5Z"
          fill="#FF5500"
          stroke="#141416"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />

        {/* 2. Средний слой: белое облако с чёрной обводкой и горизонтальными чёрными полосами */}
        <path
          d="M9.5 27.5C6.2 27.5 3.6 25.1 3.6 22C3.6 19.1 5.9 16.8 8.9 16.6C10.1 12.6 13.9 9.7 18.5 9.7C23.4 9.7 27.5 12.9 28.6 17.2C29.1 17.1 29.6 17.1 30.2 17.1C34.2 17.1 37.4 20.1 37.4 23.8C37.4 25.9 35.7 27.5 33.4 27.5H9.5Z"
          fill="#FFFFFF"
          stroke="#141416"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <g clipPath={`url(#mid-cloud-clip-${clipSuffix})`}>
          <line x1="2" y1="12.5" x2="39" y2="12.5" stroke="#141416" strokeWidth="1.55" />
          <line x1="2" y1="15.6" x2="39" y2="15.6" stroke="#141416" strokeWidth="1.55" />
          <line x1="2" y1="18.7" x2="39" y2="18.7" stroke="#141416" strokeWidth="1.55" />
          <line x1="2" y1="21.8" x2="39" y2="21.8" stroke="#141416" strokeWidth="1.55" />
        </g>
        <path
          d="M9.5 27.5C6.2 27.5 3.6 25.1 3.6 22C3.6 19.1 5.9 16.8 8.9 16.6C10.1 12.6 13.9 9.7 18.5 9.7C23.4 9.7 27.5 12.9 28.6 17.2C29.1 17.1 29.6 17.1 30.2 17.1C34.2 17.1 37.4 20.1 37.4 23.8C37.4 25.9 35.7 27.5 33.4 27.5H9.5Z"
          fill="none"
          stroke="#141416"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />

        {/* 3. Передний слой: сплошное чёрное облако */}
        <path
          d="M11.2 31.8C7.4 31.8 4.4 29.2 4.4 25.9C4.4 22.8 7 20.3 10.4 20.1C11.9 17.2 15.2 15.2 19.1 15.2C23.5 15.2 27.3 17.8 28.5 21.4C31.7 21.7 34.2 24.1 34.2 27C34.2 29.7 31.7 31.8 28.4 31.8H11.2Z"
          fill="#141416"
          stroke="#141416"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  // Наклонная ленточка-переход между разделами: чередуется оранжевая ('orange') и синяя ('blue')
  const renderSectionRibbon = (variant: 'orange' | 'blue') => (
    <div className="section-ribbon-wrap">
      <div className={`section-ribbon section-ribbon--${variant}`}>
        <div className="section-ribbon-track">{RIBBON_TEXT}</div>
      </div>
    </div>
  );

  // Карточка товара (5 прямых дочерних элементов для CSS subgrid; «Новинка» оранжевая, «Скидка» синяя)
  const renderProductCard = (
    product: Product,
    onCardClickOverride?: () => void
  ) => {
    const activeColorId = cardColors[product.id] || product.defaultColorId;
    const activeColor =
      FILAMENT_COLORS.find((c) => c.id === activeColorId) || FILAMENT_COLORS[0];
    const isJustAdded = justAddedKey === `${product.id}-${activeColorId}`;
    const isDiscountBadge = Boolean(product.tag?.startsWith('Скидка'));

    const handleCardClick = () => {
      if (onCardClickOverride) {
        onCardClickOverride();
      }
    };

    return (
      <article
        key={product.id}
        className="card product-card"
        data-spring="default"
        onClick={handleCardClick}
      >
        {/* 1. Визуал товара с бейджем: Новинка — оранжевый, Скидка — синий */}
        <div className="product-card-visual-wrap">
          {product.tag && (
            <span
              className={`meta-badge ${
                isDiscountBadge ? 'meta-badge--azure' : 'meta-badge--brand'
              } product-card-badge-overlay`}
            >
              {product.tag}
            </span>
          )}
          <ParametricRender
            silhouette={product.silhouette}
            colorId={activeColorId}
            twistDeg={product.twistDeg}
          />
        </div>

        {/* 2. Заголовок */}
        <h3 className="meta-card-title">{product.name}</h3>

        {/* 3. Краткое описание */}
        <p className="prose-compact line-clamp-2">{product.shortDescription}</p>

        {/* 4. Футер карточки: выбор оттенка (с оранжевой обводкой), линия, цена и кнопка «В корзину» */}
        <div className="product-card-footer">
          <div
            className="card-row-between"
            style={{ alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="filament-swatches"
              role="group"
              aria-label={`Выбор цвета для ${product.name}`}
            >
              {product.availableColorIds.map((cId) => {
                const swatch = FILAMENT_COLORS.find((f) => f.id === cId);
                if (!swatch) return null;
                return (
                  <button
                    key={cId}
                    type="button"
                    className="swatch-btn"
                    data-spring="fast"
                    aria-pressed={activeColorId === cId}
                    aria-label={`${product.name} — цвет ${swatch.name}`}
                    style={{ backgroundColor: swatch.cssColor }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardColors((prev) => ({
                        ...prev,
                        [product.id]: cId,
                      }));
                    }}
                  />
                );
              })}
            </div>
            <span className="inline-meta">{activeColor.shortName}</span>
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
                handleAddToCart(product.id, activeColorId, 1, false);
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
  };

  return (
    <div>
      {/* Полноэкранный бэкдроп для боковых шторок */}
      <div ref={backdropRef} className="backdrop" data-backdrop />

      {/* 1. Левая шторка навигации (#main-drawer) с кнопкой «Личный кабинет» в самом низу */}
      <aside id="main-drawer" className="drawer" data-menu="default" aria-label="Главное меню сайта">
        <div className="stack">
          <div className="header-bar">
            <span className="heading-group drawer-eyebrow-unbounded text-accent truncate-1">
              TRENDYFORM // МЕНЮ
            </span>
            <button
              type="button"
              className="btn btn--surface btn--icon"
              data-spring="fast"
              data-menu-close
              aria-label="Закрыть меню навигации"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>

          <p className="prose-compact">
            Создаём выразительные вазы, уютный свет и предметы интерьера, к которым приятно прикасаться каждый день.
          </p>

          <nav className="drawer-nav" aria-label="Разделы сайта">
            <a href="#hero" className="ui-nav-drawer" data-spring="fast" data-menu-close>
              01. Главная
            </a>
            <a
              href="#new-arrivals"
              className="ui-nav-drawer"
              data-spring="fast"
              data-menu-close
              onClick={(e) => {
                e.preventDefault();
                setIsCatalogOpen(true);
              }}
            >
              02. Каталог
            </a>
            <a href="#custom-order" className="ui-nav-drawer" data-spring="fast" data-menu-close>
              03. Своя модель
            </a>
            <a href="#about" className="ui-nav-drawer" data-spring="fast" data-menu-close>
              04. О нас
            </a>
            <a href="#b2b" className="ui-nav-drawer ui-nav-drawer--accent" data-spring="fast" data-menu-close>
              05. Для бизнеса →
            </a>
          </nav>
        </div>

        {/* Кнопка «Личный кабинет» в самом низу меню */}
        <button
          type="button"
          className="btn btn--secondary"
          style={{ width: '100%' }}
          data-spring="fast"
          data-menu-close
          onClick={() => setIsAccountModalOpen(true)}
        >
          Личный кабинет
        </button>
      </aside>

      {/* 2. Правая шторка корзины (#cart-drawer) со скроллбаром СЛЕВА */}
      <CartDrawer
        totals={cartTotals}
        promoInput={promoCode}
        onPromoChange={setPromoCode}
        onUpdateQty={handleUpdateCartQty}
        onClearCart={() => setCartItems([])}
      />

      {/* 3. Липкая шапка сайта */}
      <header ref={headerRef} className="site-header">
        <div className="container header-bar">
          {/* Зона 1: Кнопка меню + Фирменная облачная эмблема и TRENDYFORM шрифтом Unbounded */}
          <div className="header-brand">
            <button
              type="button"
              className="btn btn--surface btn--icon"
              data-spring="fast"
              data-menu-toggle="main-drawer"
              aria-label="Открыть меню"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path data-burger d="M4 6L20 6M4 12L20 12M4 18L20 18" />
              </svg>
            </button>
            <a href="#hero" className="brand-wordmark">
              {renderBrandGlyph('header')}
              <span className="heading-group brand-title-unbounded">
                TRENDYFORM
              </span>
            </a>
          </div>

          {/* Зона 2: Навигация + Кнопки «Личный кабинет» и «Корзина» (на мобилке — квадратные без счётчика) */}
          <div className="header-actions">
            <nav className="header-inline-nav" aria-label="Основная навигация">
              <button
                type="button"
                className="ui-nav-inline header-nav-catalog"
                data-spring="fast"
              >
                Каталог
              </button>
              <button
                type="button"
                className="ui-nav-inline header-nav-custom"
                data-spring="fast"
              >
                Своя модель
              </button>
              <a href="#about" className="ui-nav-inline header-nav-about" data-spring="fast">
                О нас
              </a>
              <a href="#b2b" className="ui-nav-inline header-nav-b2b" data-spring="fast">
                Для бизнеса
              </a>
            </nav>

            <button
              type="button"
              className="btn btn--surface header-action-btn"
              data-spring="fast"
              onClick={() => setIsAccountModalOpen(true)}
              aria-label="Личный кабинет"
            >
              <svg className="header-svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              <span className="header-btn-text">Личный кабинет</span>
            </button>

            <button
              type="button"
              className="btn btn--primary header-action-btn"
              data-spring="fast"
              data-menu-toggle="cart-drawer"
              id="cart-header-btn"
              aria-label={`Корзина, товаров: ${cartTotals.totalCount}`}
            >
              <svg className="header-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8h14l-1 12H6L5 8z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
              </svg>
              <span className="header-btn-text">Корзина</span>
              <span className="meta-badge" id="cart-count">
                {cartTotals.totalCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ====================================================================
            РАЗДЕЛ 1: HERO (Полноэкранный фон, крупный заголовок .display-mega, кнопка «Смотреть каталог»)
            ==================================================================== */}
        <section id="hero" className="photo-banner-section">
          <img
            src={HERO_BG_IMAGE}
            alt="Интерьер гостиной с вазой и настольной лампой Trendyform"
            referrerPolicy="no-referrer"
            className="photo-banner-media"
          />
          <div className="photo-banner-scrim" />

          <div className="container photo-banner-content">
            <div className="photo-banner-panel stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
              <div className="cluster">
                <span className="meta-badge meta-badge--brand">ДИЗАЙН В КАЖДОЙ ЛИНИИ</span>
                <span className="meta-badge meta-badge--azure">СОБСТВЕННАЯ РАЗРАБОТКА</span>
              </div>

              <h1 className="display-mega hero-display-title">
                Выразительные формы для вашего дома
              </h1>

              <p className="prose-lead photo-banner-lead">
                Мы придумываем и создаём оригинальные вазы, уютные светильники и предметы декора, которые наполняют интерьер теплом и становятся частью повседневной жизни.
              </p>

              <div className="cluster" style={{ '--cluster-gap': 'var(--space-sm)', paddingTop: 'var(--space-2xs)' } as React.CSSProperties}>
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  data-spring="fast"
                  onClick={() => setIsCatalogOpen(true)}
                >
                  Смотреть каталог
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Ленточка-переход 1 (Оранжевая) */}
        {renderSectionRibbon('orange')}

        {/* ====================================================================
            РАЗДЕЛ 2: НОВИНКИ (CSS Subgrid на ПК/планшете + свайп-лента на телефоне)
            ==================================================================== */}
        <section id="new-arrivals" className="screen-section">
          <div className="container stack" style={{ '--stack-gap': 'var(--space-lg)' } as React.CSSProperties}>
            <div className="card-row-between" style={{ alignItems: 'flex-end' }}>
              <div className="stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
                <div className="cluster">
                  <span className="meta-badge meta-badge--brand">СВЕЖАЯ КОЛЛЕКЦИЯ</span>
                  <span className="meta-badge meta-badge--azure">СКИДКИ</span>
                </div>
                <h2 className="heading-page">Новинки</h2>
              </div>

              <button
                type="button"
                className="btn btn--primary new-arrivals-desktop-cta"
                data-spring="fast"
              >
                Смотреть весь каталог
              </button>
            </div>

            {/* Десктоп (4 в ряд) и Планшет (сетка 2×2) с выравниванием через CSS subgrid */}
            <div className="new-arrivals-grid">
              {newArrivals.map((product) => renderProductCard(product))}
            </div>

            {/* Мобильная круговая свайп-лента: без стрелок, соседние карточки чуть торчат по бокам
                и уходят влево/вправо и чуть назад, а снизу кнопка «Каталог» */}
            <div className="new-arrivals-carousel" aria-label="Лента новинок">
              <div
                className="carousel-peek-viewport"
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
                onPointerUp={finishCarouselDrag}
                onPointerCancel={finishCarouselDrag}
              >
                <div ref={carouselStageRef} className="carousel-peek-stage">
                  {newArrivals.map((product, idx) => {
                    const baseOffset = getCircularCardOffset(
                      idx,
                      carouselIndex,
                      newArrivals.length
                    );
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

                    return (
                      <div
                        key={product.id}
                        className="carousel-peek-item"
                        data-offset={baseOffset}
                        data-dragging={isDraggingCarousel ? 'true' : 'false'}
                        onPointerEnter={() => {
                          if (baseOffset === 0) {
                            carouselSpreadSpringRef.current?.to(1);
                          }
                        }}
                        onPointerLeave={() => {
                          if (baseOffset === 0) {
                            carouselSpreadSpringRef.current?.to(0);
                          }
                        }}
                        style={{
                          transform: `translate3d(${translatePct.toFixed(2)}%, 0, 0) scale(${scaleVal.toFixed(3)})`,
                          opacity: opacityVal,
                          zIndex: zIndexVal,
                          pointerEvents: absOffset > 1.35 ? 'none' : 'auto',
                        }}
                      >
                        {renderProductCard(product, () => {
                          if (carouselDragRef.current.didSwipe) {
                            carouselDragRef.current.didSwipe = false;
                            return;
                          }
                          if (baseOffset !== 0) {
                            carouselSpreadSpringRef.current?.to(0);
                            setCarouselIndex(idx);
                          }
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--lg"
                data-spring="fast"
              >
                Каталог
              </button>
            </div>
          </div>
        </section>

        {/* Ленточка-переход 2 (Синяя) */}
        {renderSectionRibbon('blue')}

        {/* ====================================================================
            РАЗДЕЛ 3: ЗАКАЗАТЬ СВОЮ МОДЕЛЬ (Поменяли местами с разделом «О нас»)
            ==================================================================== */}
        <section id="custom-order" className="screen-section">
          <div className="container stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
            {/* Верхняя строка с цветными плашками (исключена из выравнивания высоты двух колонок) */}
            <div className="cluster">
              <span className="meta-badge meta-badge--brand">СВОЯ МОДЕЛЬ</span>
              <span className="meta-badge meta-badge--azure">
                ИНДИВИДУАЛЬНЫЙ ЗАКАЗ
              </span>
            </div>

            {/* Двухколоночная сетка одинаковой высоты (align-items: stretch) */}
            <div className="custom-order-grid">
              <div className="split-col-equal">
                <div className="stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
                  <h2 className="heading-page">
                    Сделаем уникальную модель специально для вас
                  </h2>

                  <p className="prose-lead text-secondary">
                    Хотите вазу необычной высоты под любимую нишу, светильник в особенном оттенке или оригинальный подарок по вашему эскизу? Мы придумаем, смоделируем и изготовим изделия специально под вашу задумку.
                  </p>
                </div>

                <div className="stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
                  <div className="b2b-feature-row">
                    <div className="heading-group">По вашей фотографии, наброску или описанию</div>
                    <p className="prose-compact">
                      Достаточно рассказать задумку своими словами — мы сами подготовим эскиз и согласуем с вами форму перед изготовлением.
                    </p>
                  </div>
                  <div className="b2b-feature-row">
                    <div className="heading-group">Подбор идеального размера и оттенка</div>
                    <p className="prose-compact">
                      Адаптируем пропорции до миллиметра под вашу полку, стол или подоконник.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="card split-card-equal"
                style={{
                  padding: 'var(--space-lg)',
                  cursor: 'default',
                  border: '0.0625rem solid var(--color-border-subtle)',
                } as React.CSSProperties}
              >
                <div className="stack" style={{ '--stack-gap': 'var(--space-2xs)' } as React.CSSProperties}>
                  <h3 className="heading-modal">Заказать свою модель</h3>
                  <p className="prose-compact">
                    Расскажите, что вы хотите создать — мы рассчитаем стоимость и свяжемся с вами.
                  </p>
                </div>

                {customSuccess ? (
                  <div
                    className="stack"
                    style={{
                      '--stack-gap': 'var(--space-sm)',
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface-bg)',
                      border: '0.0625rem solid var(--color-border-strong)',
                    } as React.CSSProperties}
                    role="status"
                  >
                    <div className="meta-status text-success">
                      Заявка принята, {customSuccess}!
                    </div>
                    <p className="prose-compact">
                      Мы внимательно изучим вашу задумку и напишем вам сегодня, чтобы обсудить форму и детали.
                    </p>
                    <button
                      type="button"
                      className="btn btn--surface"
                      data-spring="fast"
                      onClick={() => {
                        setCustomSuccess(null);
                        setCustomIdea('');
                      }}
                    >
                      Отправить ещё одну идею
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCustomModelSubmit}
                    className="split-form-equal"
                    noValidate
                  >
                    <div>
                      <label htmlFor="custom-idea" className="ui-label">
                        Что вы хотите создать?
                      </label>
                      <textarea
                        id="custom-idea"
                        rows={3}
                        className="ui-input"
                        value={customIdea}
                        onChange={(e) => setCustomIdea(e.target.value)}
                        placeholder="Например: высокая узкая ваза 30 см для сухоцветов или подставка под украшения..."
                        required
                      />
                    </div>

                    <div className="cluster" style={{ '--cluster-gap': 'var(--space-sm)' } as React.CSSProperties}>
                      <div style={{ flex: '1 1 10rem' }}>
                        <label htmlFor="custom-name" className="ui-label">
                          Имя
                        </label>
                        <input
                          id="custom-name"
                          type="text"
                          className="ui-input"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Антон"
                          required
                        />
                      </div>
                      <div style={{ flex: '1 1 12rem' }}>
                        <label htmlFor="custom-contact" className="ui-label">
                          Телефон
                        </label>
                        <input
                          id="custom-contact"
                          type="tel"
                          inputMode="numeric"
                          className="ui-input"
                          value={customContact}
                          onChange={(e) => setCustomContact(formatRussianPhoneInput(e.target.value))}
                          placeholder="+7 (900) 000-00-00"
                          required
                        />
                      </div>
                    </div>

                    {customError && (
                      <p className="prose-compact text-danger" role="alert">
                        {customError}
                      </p>
                    )}

                    <button type="submit" className="btn btn--primary btn--lg" data-spring="fast">
                      Обсудить мою модель
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Ленточка-переход 3 (Оранжевая) */}
        {renderSectionRibbon('orange')}

        {/* ====================================================================
            РАЗДЕЛ 4: О НАС (Полноэкранный спокойный фото-фон, заголовок, текст, кнопка «Узнать больше»)
            ==================================================================== */}
        <section id="about" className="photo-banner-section">
          <img
            src={ABOUT_BG_IMAGE}
            alt="Коллекция авторских изделий Trendyform в интерьере студии"
            referrerPolicy="no-referrer"
            className="photo-banner-media"
          />
          <div className="photo-banner-scrim photo-banner-scrim--about" />

          <div className="container photo-banner-content">
            <div className="photo-banner-panel stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
              <div className="cluster">
                <span className="meta-badge meta-badge--brand">О НАС</span>
                <span className="meta-badge meta-badge--azure">АВТОРСКАЯ РАЗРАБОТКА</span>
              </div>

              <h2 className="display-hero hero-display-title">
                Всё началось с желания создавать что-то своё
              </h2>

              <p className="prose-lead photo-banner-lead">
                Так появился Trendyform — авторский бренд из Новосибирска, в котором воплотилась наша любовь к дизайну, выразительным формам и нестандартному взгляду на привычные вещи. Каждая наша модель — собственная разработка, созданная, чтобы радовать вас каждый день.
              </p>

              <div className="cluster" style={{ '--cluster-gap': 'var(--space-sm)', paddingTop: 'var(--space-2xs)' } as React.CSSProperties}>
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  data-spring="fast"
                >
                  Узнать больше
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Ленточка-переход 4 (Синяя) */}
        {renderSectionRibbon('blue')}

        {/* ====================================================================
            РАЗДЕЛ 5: B2B / ДЛЯ БИЗНЕСА (Без кнопки «Перейти в каталог», синяя кнопка «Связаться»)
            ==================================================================== */}
        <B2BSection onOpenCatalog={() => setIsCatalogOpen(true)} />
      </main>

      {/* Ленточка-переход 5 перед футером (Оранжевая — продолжает чередование) */}
      {renderSectionRibbon('orange')}

      {/* ======================================================================
           ФУТЕР (#delivery) — 4 основных раздела по 25%:
           1. TRENDYFORM + Авторский бренд (по центру на мобильном)
           2. Магазин: Каталог, Личный кабинет, Корзина
           3. Покупателю: О нас, Своя модель, Для бизнеса, Оплата и доставка, Оферта, Конфиденциальность
           4. Связь: Telegram, Instagram, TikTok, YouTube, Pinterest
          ====================================================================== */}
      <footer id="delivery" className="site-footer">
        <div className="container stack" style={{ '--stack-gap': 'var(--space-lg)' } as React.CSSProperties}>
          <div className="footer-grid">
            {/* Раздел 1: TRENDYFORM и Авторский бренд */}
            <div className="footer-col--brand stack" style={{ '--stack-gap': 'var(--space-2xs)' } as React.CSSProperties}>
              <a href="#hero" className="brand-wordmark">
                {renderBrandGlyph('footer')}
                <span className="heading-group brand-title-unbounded">TRENDYFORM</span>
              </a>
              <p className="prose-compact">Авторский бренд</p>
            </div>

            {/* Раздел 2: Магазин */}
            <div className="footer-col--shop stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <div className="heading-group">Магазин</div>
              <div className="footer-links-list">
                <button type="button" className="footer-link">
                  Каталог
                </button>
                <button type="button" className="footer-link">
                  Корзина
                </button>
                <button type="button" className="footer-link">
                  Личный кабинет
                </button>
              </div>
            </div>

            {/* Раздел 3: Покупателю */}
            <div className="footer-col--buyer stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <div className="heading-group">Покупателю</div>
              <div className="footer-links-list">
                <button type="button" className="footer-link">
                  О нас
                </button>
                <button type="button" className="footer-link">
                  Своя модель
                </button>
                <button type="button" className="footer-link">
                  Для бизнеса
                </button>
                <button type="button" className="footer-link">
                  Оплата и доставка
                </button>
                <button type="button" className="footer-link">
                  Оферта
                </button>
                <button type="button" className="footer-link">
                  Конфиденциальность
                </button>
              </div>
            </div>

            {/* Раздел 4: Связь */}
            <div className="footer-col--contact stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <div className="heading-group">Связь</div>
              <div className="footer-links-list">
                <button type="button" className="footer-link">
                  Telegram
                </button>
                <button type="button" className="footer-link">
                  Instagram
                </button>
                <button type="button" className="footer-link">
                  TikTok
                </button>
                <button type="button" className="footer-link">
                  YouTube
                </button>
                <button type="button" className="footer-link">
                  Pinterest
                </button>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="card-row-between">
            <p className="system-legal">
              © 2026 Trendyform. С любовью к деталям.
            </p>
            <p className="system-legal">
              Разработан{' '}
              <a
                href="https://github.com/skoknik"
                target="_blank"
                rel="noopener noreferrer"
              >
                skoknik
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Модальное окно полного каталога */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddToCart={(productId, colorId) =>
          handleAddToCart(productId, colorId, 1, false)
        }
      />

      {/* Модальное окно «Личный кабинет» (плавное появление из центра + плавное затемнение через пружины) */}
      <div
        ref={accountOverlayRef}
        className="modal-overlay modal-overlay--spring"
        role="dialog"
        aria-modal={isAccountModalOpen}
        aria-hidden={!isAccountModalOpen}
        aria-labelledby="account-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsAccountModalOpen(false);
        }}
      >
        <div
          ref={accountDialogRef}
          className="modal-dialog modal-dialog--small modal-dialog--spring stack"
          style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}
        >
          <div className="card-row-between" style={{ alignItems: 'center' }}>
            <span className="meta-badge meta-badge--azure">ПРОФИЛЬ</span>
            <button
              type="button"
              className="btn btn--surface btn--icon"
              data-spring="fast"
              onClick={() => setIsAccountModalOpen(false)}
              aria-label="Закрыть личный кабинет"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>

          <h2 id="account-modal-title" className="heading-section">
            Личный кабинет
          </h2>

          <form
            className="stack"
            style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}
            onSubmit={(e) => {
              e.preventDefault();
            }}
            noValidate
          >
            <p className="prose-compact">
              Введите номер телефона, чтобы отслеживать статус заказов и сохранять избранные модели.
            </p>
            <div>
              <label htmlFor="account-phone-input" className="ui-label">
                Телефон
              </label>
              <input
                id="account-phone-input"
                type="tel"
                inputMode="numeric"
                className="ui-input"
                value={accountPhone}
                onChange={(e) => setAccountPhone(formatRussianPhoneInput(e.target.value))}
                placeholder="+7 (900) 000-00-00"
                required
              />
            </div>
            <button type="submit" className="btn btn--primary" data-spring="fast">
              Войти
            </button>
          </form>
        </div>
      </div>

      {/* Модальное окно полной истории бренда («Узнать больше» в разделе «О нас») */}
      {isAboutModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-story-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAboutModalOpen(false);
          }}
        >
          <div className="modal-dialog stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
            <div className="card-row-between" style={{ alignItems: 'center' }}>
              <div className="cluster">
                <img
                  src={BRAND_LOGO_IMAGE}
                  alt="Логотип Trendyform"
                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-full)' }}
                />
                <span className="meta-badge meta-badge--brand">ИСТОРИЯ БРЕНДА</span>
                <span className="meta-badge meta-badge--azure">НОВОСИБИРСК</span>
              </div>
              <button
                type="button"
                className="btn btn--surface btn--icon"
                data-spring="fast"
                onClick={() => setIsAboutModalOpen(false)}
                aria-label="Закрыть историю бренда"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>
            </div>

            <h2 id="about-story-title" className="heading-section">
              О бренде Trendyform
            </h2>

            <blockquote className="display-quote">
              «Всё началось с желания создавать что-то своё — выразительные формы и нестандартный взгляд на привычные вещи».
            </blockquote>

            <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
              <p className="prose-body">
                Так появился <strong>Trendyform</strong> — авторский бренд из Новосибирска, в котором воплотилась наша любовь к дизайну, выразительным формам и нестандартному взгляду на привычные вещи.
              </p>
              <p className="prose-body">
                Мы придумываем, моделируем, экспериментируем с цветами и формами. Не боимся пробовать новое, менять решения и начинать сначала, если результат нас не устраивает.
              </p>
              <p className="prose-body">
                Каждая наша модель — собственная разработка. Мы превращаем идеи в оригинальные предметы для дома, объединяя выразительный дизайн и функциональность. Особенно приятно видеть, как наши изделия находят своё место в ваших интерьерах и становятся частью повседневной жизни.
              </p>
              <p className="prose-body">
                Мы также создаём индивидуальные изделия для общественных пространств, заведений, студий и брендов, разрабатывая решения с учётом их фирменного стиля и задач.
              </p>
              <p className="prose-body">
                Спасибо, что выбираете нас и становитесь частью нашей истории! С любовью к деталям, <strong>Trendyform</strong>.
              </p>
            </div>

            <div className="cluster">
              <button
                type="button"
                className="btn btn--primary"
                data-spring="fast"
                onClick={() => {
                  setIsAboutModalOpen(false);
                  setIsCatalogOpen(true);
                }}
              >
                Смотреть каталог изделий
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Информационные окна раздела «Покупателю»: Оплата и доставка, Оферта, Конфиденциальность */}
      {infoDocModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-doc-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInfoDocModal(null);
          }}
        >
          <div className="modal-dialog stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
            <div className="card-row-between" style={{ alignItems: 'center' }}>
              <span className="meta-badge meta-badge--azure">ПОКУПАТЕЛЮ</span>
              <button
                type="button"
                className="btn btn--surface btn--icon"
                data-spring="fast"
                onClick={() => setInfoDocModal(null)}
                aria-label="Закрыть окно"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6L18 18M6 18L18 6" />
                </svg>
              </button>
            </div>

            {infoDocModal === 'shipping' && (
              <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
                <h2 id="info-doc-modal-title" className="heading-section">
                  Оплата и доставка
                </h2>
                <p className="prose-body">
                  Отправляем заказы по всей России из Новосибирска через <strong>Ozon</strong>, <strong>Яндекс Доставку</strong> и <strong>СДЭК</strong>.
                </p>
                <p className="prose-body">
                  При сумме заказа от <strong>3 000 ₽</strong> доставка абсолютно бесплатная. Каждое изделие бережно упаковывается в защитный ложемент перед отправкой.
                </p>
              </div>
            )}

            {infoDocModal === 'terms' && (
              <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
                <h2 id="info-doc-modal-title" className="heading-section">
                  Публичная оферта
                </h2>
                <p className="prose-body">
                  Оформляя заказ в интернет-магазине Trendyform, покупатель соглашается с условиями приобретения и доставки авторских предметов интерьера, представленных в каталоге или изготовленных по индивидуальному эскизу.
                </p>
                <p className="system-legal">
                  Возврат и обмен изделий надлежащего качества осуществляется в течение 14 дней с момента получения заказа при сохранении товарного вида.
                </p>
              </div>
            )}

            {infoDocModal === 'privacy' && (
              <div className="stack" style={{ '--stack-gap': 'var(--space-sm)' } as React.CSSProperties}>
                <h2 id="info-doc-modal-title" className="heading-section">
                  Политика конфиденциальности
                </h2>
                <p className="prose-body">
                  Мы бережно относимся к вашим персональным данным: имя и номер телефона используются исключительно для связи по вашему заказу и отправки уведомлений о доставке.
                </p>
                <p className="system-legal">
                  Данные не передаются третьим лицам, за исключением выбранной вами службы доставки (Ozon, Яндекс Доставка или СДЭК) для вручения посылки.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
