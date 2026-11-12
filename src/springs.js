// 1. Все 6 пружин Material 3 Expressive (AOSP Motion.md)
export const SPRINGS = {
  fast:    { spatial: [1400, 0.9], effects: [3800, 1.0] },
  default: { spatial: [700,  0.9], effects: [1600, 1.0] },
  slow:    { spatial: [300,  0.9], effects: [800,  1.0] },
};

// Прямой доступ ко всем 6 атрибутам по именам из документации Android Motion.md
export const MOTION_SPRINGS = {
  fastSpatial:    SPRINGS.fast.spatial,
  fastEffects:    SPRINGS.fast.effects,
  defaultSpatial: SPRINGS.default.spatial,
  defaultEffects: SPRINGS.default.effects,
  slowSpatial:    SPRINGS.slow.spatial,
  slowEffects:    SPRINGS.slow.effects,
};

// Парсер атрибута: понимает пресеты ("fast" | "default" | "slow")
// и кастомные числа ("1000, 0.8" -> spatial [1000, 0.8], effects [2200, 1.0]).
// Защищён от ключей Object.prototype ("toString") и некорректных чисел (Infinity, NaN).
function resolveSpringGroup(attrValue, fallback = SPRINGS.fast) {
  if (!attrValue || typeof attrValue !== 'string') return fallback;
  if (Object.hasOwn(SPRINGS, attrValue)) return SPRINGS[attrValue];

  const parts = attrValue.split(',').map((s) => Number(s.trim()));
  if (
    parts.length === 2 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    parts[0] > 0 &&
    parts[1] > 0
  ) {
    return {
      spatial: [parts[0], parts[1]],
      effects: [parts[0] * 2.2, 1.0],
    };
  }
  return fallback;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Единый глобальный планировщик кадров (1 RAF на все активные пружины страницы)
const activeSprings = new Set();
let rafId = 0;

function tick(now) {
  rafId = 0;
  for (const spring of Array.from(activeSprings)) {
    spring.step(now);
  }
  if (activeSprings.size && !rafId) {
    rafId = requestAnimationFrame(tick);
  }
}

// 2. Физический движок пружины (AOSP SpringForce)
export class Spring {
  vel = 0;
  running = false;
  lastTime = 0;

  constructor([k, damping], initial = 0, onUpdate, onRest = null) {
    this.configure([k, damping]);
    this.onUpdate = onUpdate;
    this.onRest = onRest;
    this.val = this.target = initial;
    onUpdate?.(initial);
  }

  configure([k, damping]) {
    const safeK = Number.isFinite(k) && k > 0 ? k : 1400;
    const safeDamping = Number.isFinite(damping) && damping > 0 ? Math.min(damping, 1) : 0.9;
    this.damping = safeDamping;
    this.wn = Math.sqrt(safeK);
    this.gamma = this.damping * this.wn;
    this.wd = this.damping < 1 ? this.wn * Math.sqrt(1 - this.damping * this.damping) : 0;
  }

  set(val) {
    this.running = false;
    activeSprings.delete(this);
    this.val = this.target = val;
    this.vel = 0;
    this.onUpdate?.(val);
    this.onRest?.();
  }

  to(target, vel = null) {
    this.target = target;
    if (vel !== null) this.vel = vel;

    if (reducedMotion.matches) {
      this.set(target);
      return;
    }

    if (this.val === target && this.vel === 0) {
      if (this.running) {
        this.running = false;
        activeSprings.delete(this);
      }
      this.onRest?.();
      return;
    }

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      activeSprings.add(this);
      if (!rafId) rafId = requestAnimationFrame(tick);
    }
  }

  step(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    if (dt <= 0) return;

    const x = this.val - this.target;
    let disp;

    if (this.damping >= 1) {
      // Критическое затухание (Google AOSP Effects)
      const b = this.vel + this.wn * x;
      const decay = Math.exp(-this.wn * dt);
      disp = (x + b * dt) * decay;
      this.vel = -disp * this.wn + b * decay;
    } else {
      // Затухающие колебания (Google AOSP Spatial)
      const b = (this.gamma * x + this.vel) / this.wd;
      const angle = this.wd * dt;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const decay = Math.exp(-this.gamma * dt);
      disp = decay * (x * cos + b * sin);
      this.vel = -disp * this.gamma + decay * this.wd * (b * cos - x * sin);
    }

    this.val = disp + this.target;

    if (Math.abs(this.vel) < 0.0125 && Math.abs(disp) < 0.0002) {
      this.val = this.target;
      this.vel = 0;
      this.running = false;
      activeSprings.delete(this);
      this.onUpdate?.(this.val);
      this.onRest?.();
      return;
    }

    this.onUpdate?.(this.val);
  }
}

// 3. Морфинг SVG-пути: 0 = гамбургер, 1 = крестик
function getBurgerPath(v) {
  const vPos = Math.max(0, v);
  const vc = Math.min(1, vPos);
  const x1 = (4 + 2 * vPos).toFixed(3);
  const x2 = (20 - 2 * vPos).toFixed(3);
  const y1 = (6 + 12 * vPos).toFixed(3);
  const y2 = (18 - 12 * vPos).toFixed(3);
  const m1 = (4 + 8 * vc).toFixed(3);
  const m2 = (20 - 8 * vc).toFixed(3);
  return `M${x1} 6L${x2} ${y1}M${m1} 12L${m2} 12M${x1} 18L${x2} ${y2}`;
}

// 4. Делегированная система пружин [data-spring] с поддержкой каскадной вложенности в DOM
const springStates = new WeakMap();
const hoveredSet = new Set();
let springsDelegated = false;
let hoveredEl = null;
let pressedEl = null;
let lastPointerOverEl = null;

function isDisabled(el) {
  return Boolean(el?.matches?.(':disabled, [aria-disabled="true"]'));
}

function isEditableTarget(el) {
  if (!el || typeof el.matches !== 'function') return false;
  return (
    el.isContentEditable === true ||
    el.matches(
      'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable=""], [contenteditable="true"]'
    )
  );
}

// Поиск ближайшего активного [data-spring] вверх по дереву (игнорируя вложенные disabled-элементы)
function findEnabledSpringEl(node) {
  if (!node || typeof node.closest !== 'function') return null;
  let el = node.closest('[data-spring]');
  while (el && isDisabled(el)) {
    el = el.parentElement?.closest?.('[data-spring]') ?? null;
  }
  return el;
}

// Сбор всей цепочки активных [data-spring] от целевого элемента вверх к родителям (например, .btn -> .card)
function collectEnabledSpringChain(leafEl) {
  const chain = new Set();
  let cur = leafEl;
  while (cur) {
    if (!isDisabled(cur)) chain.add(cur);
    cur = findEnabledSpringEl(cur.parentElement);
  }
  return chain;
}

// Проверка: находится ли курсор в пределах немасштабированного бокса элемента.
// Защищает от ложного pointerleave на краю кнопки при её сжатии до scale(0.95).
function isInsideUnscaledBox(el, state, clientX, clientY) {
  if (typeof clientX !== 'number' || typeof el.getBoundingClientRect !== 'function') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;

  const s = state.scale?.val || 1;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const halfW = rect.width / 2 / Math.min(s, 0.95);
  const halfH = rect.height / 2 / Math.min(s, 0.95);
  const y = typeof clientY === 'number' ? clientY : cy;

  return (
    clientX >= cx - halfW - 1 &&
    clientX <= cx + halfW + 1 &&
    y >= cy - halfH - 1 &&
    y <= cy + halfH + 1
  );
}

function shouldIgnoreEdgeLeave(el, state, e) {
  if (!state.isPressed) return false;
  if (isInsideUnscaledBox(el, state, e?.clientX, e?.clientY)) return true;
  if (typeof e?.clientX === 'number' && typeof state.downX === 'number') {
    const dx = e.clientX - state.downX;
    const dy = (e.clientY ?? state.downY ?? 0) - (state.downY ?? 0);
    if (Math.hypot(dx, dy) <= 4) return true;
  }
  if (!state.hasPointerMoved && typeof e?.clientX !== 'number') {
    return true;
  }
  return false;
}

function getOrCreateSpringState(el) {
  let state = springStates.get(el);
  if (state) return state;

  const group = resolveSpringGroup(el.dataset.spring, SPRINGS.fast);
  const noScale = el.hasAttribute('data-no-scale');
  const noEffects = el.hasAttribute('data-no-effects');

  const checkRest = () => {
    const scaleRunning = Boolean(state?.scale?.running);
    const pressRunning = Boolean(state?.press?.running);
    if (!scaleRunning && !pressRunning) {
      el.style.willChange = 'auto';
      const scaleAtRest = !state?.scale || Math.abs(state.scale.val - 1) < 0.0005;
      const pressAtRest = !state?.press || Math.abs(state.press.val) < 0.0005;
      if (scaleAtRest && pressAtRest) {
        el.removeAttribute?.('data-spring-active');
      }
    }
  };

  const scale = noScale
    ? null
    : new Spring(group.spatial, 1, (v) => el.style.setProperty('--scale', v.toFixed(4)), checkRest);

  const press = noEffects
    ? null
    : new Spring(group.effects, 0, (v) => el.style.setProperty('--press', v.toFixed(4)), checkRest);

  const detachWindowListeners = () => {
    window.removeEventListener('pointermove', state.onWindowMove);
    window.removeEventListener('pointerup', state.onWindowUp);
    window.removeEventListener('pointercancel', state.onWindowCancel);
  };

  state = {
    scale,
    press,
    noScale,
    noEffects,
    isPressed: false,
    isHovered: false,
    pointerId: null,
    downX: undefined,
    downY: undefined,
    hasPointerMoved: false,
    update(releaseImpulse = false) {
      if (isDisabled(el)) {
        this.isPressed = false;
        this.isHovered = false;
        this.pointerId = null;
        this.hasPointerMoved = false;
        hoveredSet.delete(el);
        if (hoveredEl === el) hoveredEl = findEnabledSpringEl(el.parentElement);
        if (pressedEl === el) pressedEl = null;
        if (lastPointerOverEl === el) lastPointerOverEl = hoveredEl;
        detachWindowListeners();
      }

      const targetScale = this.isPressed ? 0.95 : this.isHovered ? 1.05 : 1;
      const targetPress = this.isPressed ? 1 : this.isHovered ? 0.2 : 0;

      if (targetScale !== 1 || targetPress !== 0 || this.scale?.running || this.press?.running) {
        el.setAttribute?.('data-spring-active', '');
      }

      if (!reducedMotion.matches) {
        el.style.willChange = this.noScale
          ? 'filter'
          : this.noEffects
            ? 'scale'
            : 'scale, filter';
      }

      let vel = null;
      if (releaseImpulse && this.scale && this.scale.val > 0.965) {
        vel = Math.min(this.scale.vel, -(this.scale.val - 0.945) * this.scale.wn * 1.1);
      }

      this.scale?.to(targetScale, vel);
      this.press?.to(targetPress);
      checkRest();
    },
    release(withImpulse = true) {
      if (!this.isPressed) return;
      this.isPressed = false;
      this.pointerId = null;
      this.hasPointerMoved = false;
      const wasPressedEl = pressedEl === el;
      if (wasPressedEl) pressedEl = null;
      detachWindowListeners();
      this.update(withImpulse);
      if (wasPressedEl && lastPointerOverEl !== hoveredEl) {
        setHoveredElement(lastPointerOverEl);
      }
    },
    onWindowMove: null,
    onWindowUp: null,
    onWindowCancel: null,
  };

  state.onWindowMove = (e) => {
    if (state.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== state.pointerId) {
      return;
    }
    if (typeof e?.clientX === 'number' && typeof state.downX === 'number') {
      const dx = e.clientX - state.downX;
      const dy = (e.clientY ?? state.downY ?? 0) - (state.downY ?? 0);
      if (Math.hypot(dx, dy) > 4 && !isInsideUnscaledBox(el, state, e.clientX, e.clientY)) {
        state.hasPointerMoved = true;
      }
    } else {
      state.hasPointerMoved = true;
    }
  };

  state.onWindowUp = (e) => {
    if (state.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== state.pointerId) {
      return;
    }
    state.release(true);
  };

  state.onWindowCancel = (e) => {
    if (state.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== state.pointerId) {
      return;
    }
    state.release(false);
  };

  // Если зажатый палец или курсор реально увели за пределы кнопки — мягко отменяем нажатие без импульса
  el.addEventListener('pointerleave', (e) => {
    if (!state.isPressed) return;
    if (state.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== state.pointerId) {
      return;
    }
    if (shouldIgnoreEdgeLeave(el, state, e)) return;
    const fallbackHover = findEnabledSpringEl(el.parentElement);
    if (lastPointerOverEl === el) lastPointerOverEl = fallbackHover;
    if (hoveredSet.has(el)) {
      setHoveredElement(fallbackHover);
    }
    state.release(false);
  });

  el.addEventListener('blur', () => state.release(false));

  springStates.set(el, state);
  return state;
}

function setHoveredElement(nextEl) {
  const nextChain = collectEnabledSpringChain(nextEl);

  for (const prevEl of Array.from(hoveredSet)) {
    if (!nextChain.has(prevEl)) {
      hoveredSet.delete(prevEl);
      const prevState = springStates.get(prevEl);
      if (prevState) {
        prevState.isHovered = false;
        prevState.update(false);
      }
    }
  }

  hoveredEl = nextEl && !isDisabled(nextEl) ? nextEl : null;

  for (const currEl of nextChain) {
    if (!hoveredSet.has(currEl)) {
      hoveredSet.add(currEl);
      const currState = getOrCreateSpringState(currEl);
      currState.isHovered = true;
      currState.update(false);
    }
  }
}

export function initAllSprings() {
  if (springsDelegated) return;
  springsDelegated = true;

  const getActivePressedEl = () => {
    if (!pressedEl) return null;
    const st = springStates.get(pressedEl);
    if (!st?.isPressed || isDisabled(pressedEl)) {
      st?.release(false);
      pressedEl = null;
      return null;
    }
    return pressedEl;
  };

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = findEnabledSpringEl(e.target);
    lastPointerOverEl = el;

    // Не переключаем ховер на дочерние/соседние элементы, пока удерживается активное нажатие
    if (getActivePressedEl()) return;
    if (typeof e.buttons === 'number' && e.buttons !== 0) return;

    setHoveredElement(el);
  });

  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const currentPressed = getActivePressedEl();
    if (hoveredEl) {
      const hoveredState = springStates.get(hoveredEl);
      if (hoveredState?.isPressed && shouldIgnoreEdgeLeave(hoveredEl, hoveredState, e)) {
        return;
      }
    }
    const rt = e.relatedTarget;
    const nextEl = rt ? findEnabledSpringEl(rt) : null;
    lastPointerOverEl = nextEl;

    if (!hoveredEl) return;
    if (currentPressed) {
      if (rt && currentPressed.contains(rt)) return;
    }
    if (!rt || !hoveredEl.contains(rt) || isDisabled(hoveredEl)) {
      setHoveredElement(nextEl);
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rawEl = e.target?.closest?.('[data-spring]');
    if (!rawEl || isDisabled(rawEl)) return;

    // Игнорируем клики по вложенным полям ввода или заблокированным контролам внутри карточки
    const disabledControl = e.target?.closest?.(':disabled, [aria-disabled="true"]');
    if (disabledControl && rawEl.contains(disabledControl)) return;
    if (rawEl !== e.target && isEditableTarget(e.target)) return;

    const state = getOrCreateSpringState(rawEl);
    if (state.isPressed) return;

    const prevPressed = getActivePressedEl();
    if (prevPressed && prevPressed !== rawEl) {
      const prevState = springStates.get(prevPressed);
      if (prevState && (e.pointerType === 'mouse' || prevState.pointerId === (e.pointerId ?? null))) {
        prevState.release(false);
      }
    }

    pressedEl = rawEl;
    state.isPressed = true;
    state.pointerId = e.pointerId ?? null;
    state.downX = e.clientX;
    state.downY = e.clientY;
    state.hasPointerMoved = false;
    state.update(false);

    window.addEventListener('pointermove', state.onWindowMove);
    window.addEventListener('pointerup', state.onWindowUp);
    window.addEventListener('pointercancel', state.onWindowCancel);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return;
    const el = e.target?.closest?.('[data-spring]');
    if (!el || e.target !== el || isDisabled(el) || isEditableTarget(e.target)) return;
    const state = getOrCreateSpringState(el);
    state.isPressed = true;
    state.pointerId = null;
    state.update(false);
  });

  document.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const el = e.target?.closest?.('[data-spring]');
    if (!el || e.target !== el) return;
    springStates.get(el)?.release(true);
  });
}

// 5. Система меню (data-menu) с синхронизацией Spatial + Effects, свайпами, блокировкой скролла и WAI-ARIA фокусом
const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const initializedMenus = new WeakSet();
const backdropSprings = new WeakMap();
const menus = new Map();
let activeMenu = null;
let menusGlobalBound = false;
let lastGestureWasDrag = false;
let lastDragEndTime = -Infinity;

function consumeDragSuppression() {
  if (!lastGestureWasDrag) return false;
  lastGestureWasDrag = false;
  return performance.now() - lastDragEndTime < 80;
}

function getOrCreateBackdropSpring(backdropEl) {
  if (!backdropEl) return null;
  let spring = backdropSprings.get(backdropEl);
  if (!spring) {
    spring = new Spring(SPRINGS.default.effects, 0, (v) => {
      const clamped = Math.max(0, Math.min(v, 1));
      const isVisible = clamped > 0.001;
      const isInteractive = isVisible && (spring?.target > 0 || activeMenu !== null);
      backdropEl.style.opacity = clamped.toFixed(4);
      backdropEl.style.pointerEvents = isInteractive ? 'auto' : 'none';
      backdropEl.style.visibility = isVisible ? 'visible' : 'hidden';
    });
    backdropSprings.set(backdropEl, spring);
  }
  return spring;
}

export function initAllMenus(
  backdropEl = document.querySelector('[data-backdrop], .backdrop')
) {
  const backdropSpring = getOrCreateBackdropSpring(backdropEl);

  document.querySelectorAll('[data-menu]').forEach((menuEl) => {
    if (initializedMenus.has(menuEl)) return;
    initializedMenus.add(menuEl);

    const group = resolveSpringGroup(menuEl.dataset.menu, SPRINGS.default);
    const toggleBtns = menuEl.id
      ? document.querySelectorAll(`[data-menu-toggle="${menuEl.id}"]`)
      : [];
    const burgerPaths = menuEl.id
      ? document.querySelectorAll(`[data-menu-toggle="${menuEl.id}"] [data-burger]`)
      : [];

    menuEl.inert = true;
    toggleBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));

    // Без искажения шрифтов и кнопок через scaleX:
    // при v > 1 работает мягкий физический сдвиг с гиперболическим сопротивлением (макс. +8%)
    const spatial = new Spring(group.spatial, 0, (v) => {
      const overshoot = v > 1 ? Math.tanh((v - 1) * 3) * 0.08 : 0;
      const translate = Math.max(0, Math.min(v, 1)) + overshoot;
      const isVisible = v > 0.001;

      menuEl.style.transform = `translate3d(${((translate - 1) * 100).toFixed(3)}%, 0, 0)`;
      menuEl.style.visibility = isVisible ? 'visible' : 'hidden';

      if (burgerPaths.length) {
        const d = getBurgerPath(v);
        burgerPaths.forEach((path) => path.setAttribute('d', d));
      }
    });

    const syncAria = (isOpen) => {
      menuEl.inert = !isOpen;
      toggleBtns.forEach((btn) => btn.setAttribute('aria-expanded', String(isOpen)));
    };

    let restoreFocusEl = null;
    let startX = 0;
    let startY = 0;
    let startVal = 0;
    let menuWidth = 1;
    let lastTime = 0;
    let vel = 0;
    let isPointerDown = false;
    let isDragging = false;
    let activePointerId = null;

    const detachDragListeners = () => {
      if (document.documentElement?.style) {
        document.documentElement.style.userSelect = '';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };

    const cancelDrag = () => {
      if (!isPointerDown && !isDragging) return;
      isPointerDown = false;
      isDragging = false;
      activePointerId = null;
      vel = 0;
      lastGestureWasDrag = false;
      detachDragListeners();
    };

    const controller = {
      el: menuEl,
      open(velArg = null) {
        cancelDrag();
        const wasAlreadyOpen = activeMenu === controller;
        if (!wasAlreadyOpen) {
          if (
            document.activeElement instanceof HTMLElement &&
            !menuEl.contains(document.activeElement) &&
            document.activeElement !== document.body
          ) {
            restoreFocusEl = document.activeElement;
          }
          if (activeMenu && activeMenu !== controller) {
            activeMenu.close(null, { restoreFocus: false });
          }
        }
        activeMenu = controller;
        syncAria(true);
        backdropSpring?.configure(group.effects);
        spatial.to(1, velArg);
        backdropSpring?.to(1);

        if (!wasAlreadyOpen) {
          const closeTarget =
            menuEl.querySelector('[data-menu-close]:not(:disabled)') ||
            menuEl.querySelector(FOCUSABLE_SELECTOR);
          closeTarget?.focus?.({ preventScroll: true });
        }
      },
      close(velArg = null, { restoreFocus = true } = {}) {
        cancelDrag();
        if (activeMenu === controller) {
          activeMenu = null;
          backdropSpring?.configure(group.effects);
          backdropSpring?.to(0);
          if (backdropEl) backdropEl.style.pointerEvents = 'none';
        }

        if (
          restoreFocus &&
          (menuEl.contains(document.activeElement) || document.activeElement === document.body)
        ) {
          const targetBtn =
            restoreFocusEl && document.contains(restoreFocusEl)
              ? restoreFocusEl
              : toggleBtns[0];
          targetBtn?.focus?.({ preventScroll: true });
        }
        restoreFocusEl = null;

        syncAria(false);
        spatial.to(0, velArg);
      },
      toggle() {
        if (activeMenu === controller) this.close();
        else this.open();
      },
      startDrag(e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (isPointerDown) return;
        isPointerDown = true;
        isDragging = false;
        lastGestureWasDrag = false;
        activePointerId = e.pointerId ?? null;
        startX = e.clientX;
        startY = e.clientY;
        menuWidth = menuEl.offsetWidth || 1;
        lastTime = performance.now();
        vel = 0;

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
      },
    };

    const onMove = (e) => {
      if (!isPointerDown) return;
      if (activePointerId !== null && e?.pointerId !== undefined && e.pointerId !== activePointerId) {
        return;
      }
      const rawDx = e.clientX - startX;
      const rawDy = e.clientY - startY;
      const dx = rawDx / menuWidth;

      if (!isDragging) {
        // Direction Lock: если пользователь скроллит меню вертикально — не перехватываем жест
        if (Math.abs(rawDy) > 6 && Math.abs(rawDy) > Math.abs(rawDx)) {
          isPointerDown = false;
          activePointerId = null;
          detachDragListeners();
          return;
        }
        if (Math.abs(dx) > 0.025) {
          isDragging = true;
          lastGestureWasDrag = true;
          startX = e.clientX;
          startVal = spatial.val;
          lastTime = performance.now();
          if (document.documentElement?.style) {
            document.documentElement.style.userSelect = 'none';
          }
          window.getSelection?.()?.removeAllRanges?.();
        }
        return;
      }

      e.preventDefault?.();
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      const prev = spatial.val;
      const raw = startVal + (e.clientX - startX) / menuWidth;
      const next = raw > 1 ? 1 + Math.tanh((raw - 1) * 2) * 0.08 : Math.max(0, raw);

      if (dt > 0.001) {
        const instVel = (next - prev) / dt;
        vel = vel * 0.4 + instVel * 0.6;
      }
      lastTime = now;

      spatial.set(next);
      backdropSpring?.set(Math.min(1, next));
    };

    const endDrag = (e) => {
      if (!isPointerDown) return;
      if (activePointerId !== null && e?.pointerId !== undefined && e.pointerId !== activePointerId) {
        return;
      }
      isPointerDown = false;
      activePointerId = null;
      detachDragListeners();

      if (!isDragging) {
        vel = 0;
        return;
      }
      isDragging = false;

      const finalVel = performance.now() - lastTime > 80 ? 0 : vel;
      vel = 0;

      if (finalVel < -1.2 || (spatial.val < 0.5 && finalVel <= 1.2)) {
        controller.close(finalVel);
      } else {
        controller.open(finalVel);
      }

      lastGestureWasDrag = true;
      lastDragEndTime = performance.now();
    };

    if (menuEl.id) menus.set(menuEl.id, controller);

    menuEl.addEventListener('pointerdown', (e) => controller.startDrag(e));

    menuEl.addEventListener('click', (e) => {
      if (isDragging || consumeDragSuppression() || activeMenu !== controller) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });

  if (backdropEl && !initializedMenus.has(backdropEl)) {
    initializedMenus.add(backdropEl);

    backdropEl.addEventListener('pointerdown', (e) => {
      activeMenu?.startDrag(e);
    });

    backdropEl.addEventListener('click', () => {
      if (!consumeDragSuppression()) activeMenu?.close();
    });
  }

  if (!menusGlobalBound) {
    menusGlobalBound = true;

    // Блокировка прокрутки страницы сквозь бэкдроп без скрытия системного скроллбара
    window.addEventListener(
      'wheel',
      (e) => {
        if (!activeMenu) return;
        const menuEl = activeMenu.el;
        if (!menuEl.contains(e.target)) {
          e.preventDefault();
          return;
        }
        const maxScroll = menuEl.scrollHeight - menuEl.clientHeight;
        if (maxScroll <= 0) {
          e.preventDefault();
          return;
        }
        const atTop = menuEl.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = menuEl.scrollTop >= maxScroll - 1 && e.deltaY > 0;
        if (atTop || atBottom) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        lastGestureWasDrag = false;
      }
      if (e.key === 'Escape' && activeMenu) {
        activeMenu.close();
        return;
      }
      if (e.key === 'Tab' && activeMenu) {
        const focusables = Array.from(
          activeMenu.el.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => !isDisabled(el) && el.offsetParent !== null);

        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first || !activeMenu.el.contains(document.activeElement))
          ) {
            e.preventDefault();
            last.focus({ preventScroll: true });
          } else if (
            !e.shiftKey &&
            (document.activeElement === last || !activeMenu.el.contains(document.activeElement))
          ) {
            e.preventDefault();
            first.focus({ preventScroll: true });
          }
        }
      }
    });

    document.addEventListener('click', (e) => {
      const toggleBtn = e.target?.closest?.('[data-menu-toggle]');
      if (toggleBtn) {
        menus.get(toggleBtn.dataset.menuToggle)?.toggle();
        return;
      }
      const closeBtn = e.target?.closest?.('[data-menu-close]');
      if (closeBtn && activeMenu) {
        activeMenu.close();
      }
    });
  }

  return menus;
}

// 6. Единая точка входа «Подключил и забыл»
export function initSpringsEngine(backdropEl) {
  initAllSprings();
  return initAllMenus(backdropEl);
}