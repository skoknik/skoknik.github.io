export type ProductCategory = 'all' | 'vases' | 'lighting' | 'planters' | 'organizers' | 'horeca';

export type SilhouetteType =
  | 'vase-twisted'
  | 'lamp-pleated'
  | 'planter-ribbed'
  | 'vase-arch'
  | 'organizer-wave'
  | 'horeca-stand';

export interface FilamentColor {
  id: string;
  name: string;
  shortName: string;
  cssColor: string;
  accentHighlight: string;
  shadowColor: string;
  finish: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Exclude<ProductCategory, 'all'>;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  shortDescription: string;
  fullDescription: string;
  dimensions: string;
  material: string;
  silhouette: SilhouetteType;
  ribsCount: number;
  twistDeg: number;
  defaultColorId: string;
  availableColorIds: string[];
  tag?: string;
  inStock: number;
  careNote: string;
  isNewArrival?: boolean;
}

export const FILAMENT_COLORS: FilamentColor[] = [
  {
    id: 'sunset-orange',
    name: 'Фирменный апельсин',
    shortName: 'Апельсин',
    cssColor: 'oklch(0.684862 0.211255 40.8638)',
    accentHighlight: 'oklch(0.82 0.16 48)',
    shadowColor: 'oklch(0.42 0.16 36)',
    finish: 'Матовая бархатистая поверхность',
  },
  {
    id: 'milk-travertine',
    name: 'Молочный травертин',
    shortName: 'Травертин',
    cssColor: 'oklch(0.93 0.018 85)',
    accentHighlight: 'oklch(0.98 0.008 85)',
    shadowColor: 'oklch(0.68 0.025 80)',
    finish: 'Тёплая каменная фактура',
  },
  {
    id: 'graphite-ink',
    name: 'Холодный графит',
    shortName: 'Графит',
    cssColor: 'oklch(0.28 0.012 286)',
    accentHighlight: 'oklch(0.48 0.018 286)',
    shadowColor: 'oklch(0.15 0.008 286)',
    finish: 'Глубокий матовый сатин',
  },
  {
    id: 'azure-cobalt',
    name: 'Лазурный кобальт',
    shortName: 'Лазурь',
    cssColor: 'oklch(0.684862 0.1544 239.03)',
    accentHighlight: 'oklch(0.82 0.12 235)',
    shadowColor: 'oklch(0.41 0.13 242)',
    finish: 'Мягкий шёлковый отлив',
  },
  {
    id: 'nordic-sage',
    name: 'Сибирский шалфей',
    shortName: 'Шалфей',
    cssColor: 'oklch(0.67 0.065 152)',
    accentHighlight: 'oklch(0.81 0.05 152)',
    shadowColor: 'oklch(0.43 0.055 152)',
    finish: 'Природный матовый оттенок',
  },
  {
    id: 'warm-terracotta',
    name: 'Обожжённая глина',
    shortName: 'Терракота',
    cssColor: 'oklch(0.58 0.135 32)',
    accentHighlight: 'oklch(0.73 0.11 36)',
    shadowColor: 'oklch(0.36 0.1 28)',
    finish: 'Керамическая матовая фактура',
  },
];

export const CATEGORY_TABS: { id: ProductCategory; label: string }[] = [
  { id: 'all', label: 'Все изделия' },
  { id: 'vases', label: 'Вазы и декор' },
  { id: 'lighting', label: 'Светильники' },
  { id: 'planters', label: 'Кашпо' },
  { id: 'organizers', label: 'Для рабочего стола' },
  { id: 'horeca', label: 'Для бизнеса' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'tf-vase-plisse-01',
    sku: 'TF-014',
    name: 'Ваза «Плиссе Спираль»',
    category: 'vases',
    categoryLabel: 'Вазы и декор',
    price: 2890,
    oldPrice: 3400,
    shortDescription:
      'Выразительная рельефная ваза с мягкой спиральной геометрией. Подходит для живых цветов с водой и сухоцветов.',
    fullDescription:
      'Авторская разработка студии Trendyform. Спиральные грани красиво ловят утренний и вечерний свет, создавая мягкие тени. Ваза полностью герметична, легко моется и устойчиво стоит на любой поверхности.',
    dimensions: '13,5 × 24 см',
    material: 'Экологичный матовый биополимер на растительной основе',
    silhouette: 'vase-twisted',
    ribsCount: 72,
    twistDeg: 68,
    defaultColorId: 'sunset-orange',
    availableColorIds: [
      'sunset-orange',
      'milk-travertine',
      'graphite-ink',
      'azure-cobalt',
      'nordic-sage',
    ],
    tag: 'Новинка',
    inStock: 8,
    careNote: 'Подходит для воды и живых букетов, легко ополаскивается тёплой водой',
    isNewArrival: true,
  },
  {
    id: 'tf-lamp-aura-02',
    sku: 'TF-029',
    name: 'Настольная лампа «Дюна»',
    category: 'lighting',
    categoryLabel: 'Светильники',
    price: 5490,
    oldPrice: 6490,
    shortDescription:
      'Уютный настольный светильник с рельефным плафоном, наполняющий комнату мягким тёплым светом без бликов.',
    fullDescription:
      'Создаёт спокойную вечернюю атмосферу в спальне или гостиной. Фактурный абажур мягко рассеивает свет, а устойчивое основание дополнено проводом в текстильной оплётке с удобным выключателем.',
    dimensions: '19 × 26,5 см',
    material: 'Светорассеивающий матовый эко-композит',
    silhouette: 'lamp-pleated',
    ribsCount: 56,
    twistDeg: 32,
    defaultColorId: 'milk-travertine',
    availableColorIds: ['milk-travertine', 'sunset-orange', 'warm-terracotta'],
    tag: 'Скидка −15%',
    inStock: 5,
    careNote: 'Тёплая светодиодная лампа в комплекте',
    isNewArrival: true,
  },
  {
    id: 'tf-planter-kora-03',
    sku: 'TF-042',
    name: 'Кашпо с автополивом «Каньон»',
    category: 'planters',
    categoryLabel: 'Кашпо',
    price: 2490,
    shortDescription:
      'Фактурное кашпо со скрытым поддоном и бережным отводом лишней влаги для здоровья домашних растений.',
    fullDescription:
      'Объединяет выразительный интерьерный дизайн и заботу о цветах: внутренний контур обеспечивает дыхание корней, а съёмный нижний резервуар удерживает запас воды и защищает мебель от капель.',
    dimensions: '15,5 × 14,5 см',
    material: 'Влагостойкий матовый биополимер',
    silhouette: 'planter-ribbed',
    ribsCount: 48,
    twistDeg: 0,
    defaultColorId: 'nordic-sage',
    availableColorIds: ['nordic-sage', 'milk-travertine', 'warm-terracotta', 'graphite-ink'],
    tag: 'Новинка',
    inStock: 12,
    careNote: 'Встроенный скрытый поддон для бережного полива',
    isNewArrival: true,
  },
  {
    id: 'tf-vase-arch-04',
    sku: 'TF-051',
    name: 'Интерьерная ваза «Арка»',
    category: 'vases',
    categoryLabel: 'Вазы и декор',
    price: 3290,
    oldPrice: 4100,
    shortDescription:
      'Скульптурный силуэт со сквозной аркой для сухоцветов, веток эвкалипта и лаконичных композиций на полке.',
    fullDescription:
      'Самодостаточный арт-объект, который преображает комод, рабочий стол или открытый стеллаж даже без цветов. Приятная матовая поверхность напоминает натуральный камень и тёплую керамику.',
    dimensions: '18 × 7,5 × 22,5 см',
    material: 'Матовый композит с каменной фактурой',
    silhouette: 'vase-arch',
    ribsCount: 64,
    twistDeg: 15,
    defaultColorId: 'azure-cobalt',
    availableColorIds: ['azure-cobalt', 'milk-travertine', 'graphite-ink', 'sunset-orange'],
    tag: 'Скидка −20%',
    inStock: 6,
    careNote: 'Внутри предусмотрена скрытая колба для стеблей',
    isNewArrival: true,
  },
  {
    id: 'tf-org-wave-05',
    sku: 'TF-067',
    name: 'Органайзер для стола «Волна»',
    category: 'organizers',
    categoryLabel: 'Для рабочего стола',
    price: 1990,
    oldPrice: 2390,
    shortDescription:
      'Лаконичная подставка с тремя отделениями разной высоты для ручек, очков, заметок и смартфона.',
    fullDescription:
      'Помогает поддерживать порядок на рабочем столе и радует глаз плавными линиями. Снизу предусмотрены мягкие силиконовые ножки, чтобы подставка не скользила и не царапала дерево.',
    dimensions: '19,5 × 9,5 × 10,5 см',
    material: 'Ударопрочный матовый биополимер',
    silhouette: 'organizer-wave',
    ribsCount: 40,
    twistDeg: 24,
    defaultColorId: 'graphite-ink',
    availableColorIds: ['graphite-ink', 'sunset-orange', 'azure-cobalt', 'milk-travertine'],
    tag: 'Скидка −17%',
    inStock: 14,
    careNote: 'Мягкие нескользящие опоры на основании',
    isNewArrival: false,
  },
  {
    id: 'tf-horeca-set-06',
    sku: 'TF-088',
    name: 'Настольный сет «Рифма» для сервировки',
    category: 'horeca',
    categoryLabel: 'Для бизнеса',
    price: 2650,
    shortDescription:
      'Салфетница с держателем меню и мини-вазой для сухоцветов — аккуратное решение для столиков кафе и дома.',
    fullDescription:
      'Продуманный комплект для красивой подачи: устойчивое утяжелённое основание, отсек под салфетки или QR-меню и изящная мини-ваза. Для заведений и брендов возможен подбор фирменного цвета и нанесение логотипа.',
    dimensions: '14,5 × 11 × 13 см',
    material: 'Моющийся износостойкий матовый композит',
    silhouette: 'horeca-stand',
    ribsCount: 36,
    twistDeg: 10,
    defaultColorId: 'warm-terracotta',
    availableColorIds: [
      'warm-terracotta',
      'sunset-orange',
      'graphite-ink',
      'milk-travertine',
      'nordic-sage',
    ],
    tag: 'Новинка',
    inStock: 20,
    careNote: 'Легко протирается влажной салфеткой, устойчив к царапинам',
    isNewArrival: false,
  },
];
