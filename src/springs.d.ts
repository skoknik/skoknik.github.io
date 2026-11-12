export interface SpringGroup {
  spatial: [number, number];
  effects: [number, number];
}

export declare const SPRINGS: {
  fast: SpringGroup;
  default: SpringGroup;
  slow: SpringGroup;
};

export declare const MOTION_SPRINGS: {
  fastSpatial: [number, number];
  fastEffects: [number, number];
  defaultSpatial: [number, number];
  defaultEffects: [number, number];
  slowSpatial: [number, number];
  slowEffects: [number, number];
};

export declare class Spring {
  vel: number;
  running: boolean;
  lastTime: number;
  damping: number;
  wn: number;
  gamma: number;
  wd: number;
  val: number;
  target: number;
  onUpdate?: (val: number) => void;
  onRest?: (() => void) | null;

  constructor(
    params: [number, number],
    initial?: number,
    onUpdate?: (val: number) => void,
    onRest?: (() => void) | null
  );
  configure(params: [number, number]): void;
  set(val: number): void;
  to(target: number, vel?: number | null): void;
  step(now: number): void;
}

export interface MenuController {
  el: HTMLElement;
  open: (velArg?: number | null) => void;
  close: (velArg?: number | null, options?: { restoreFocus?: boolean }) => void;
  toggle: () => void;
  startDrag: (e: PointerEvent) => void;
}

export declare function initAllSprings(): void;
export declare function initAllMenus(backdropEl?: Element | null): Map<string, MenuController>;
export declare function initSpringsEngine(backdropEl?: Element | null): Map<string, MenuController>;
