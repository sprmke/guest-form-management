export type ShowcaseVariant = 'aurora' | 'monolith' | 'editorial';
export type ShowcaseColorMode = 'light' | 'dark';

export type ShowcaseThemeTokens = {
  page: string;
  header: string;
  headerSheet: string;
  footer: string;
  navActive: string;
  navInactive: string;
  navMonolithActive: string;
  navHover: string;
  menuItemActive: string;
  menuItemInactive: string;
  menuItemMonolith: string;
  brandFallback: string;
  brandLogoBg: string;
  themeToggleHover: string;
  sectionBorder: string;
  sectionAlt: string;
  subheading: string;
  body: string;
  muted: string;
  card: string;
  cardBorder: string;
  highlightCard: string;
  primaryBtn: string;
  secondaryBtn: string;
  heroSecondaryBtn: string;
  testimonialCard: string;
  testimonialFooter: string;
  testimonialControl: string;
  mapPinBg: string;
  galleryFrame: string;
  galleryImageBorder: string;
  amenityCell: string;
  ruleBorder: string;
  ruleText: string;
  testimonialQuote: string;
  testimonialBlock: string;
  ctaSurface: string;
  progressInactive: string;
  progressActive: string;
  marqueeBorder: string;
};

const AURORA: Record<ShowcaseColorMode, ShowcaseThemeTokens> = {
  light: {
    page: 'bg-background text-foreground',
    header: 'border-border bg-background/75 text-foreground backdrop-blur-md',
    headerSheet: 'border-border bg-background/95 backdrop-blur-xl',
    footer: 'border-border bg-background text-foreground',
    navActive: 'bg-primary/15 text-primary',
    navInactive: 'text-muted-foreground hover:text-foreground',
    navMonolithActive: '',
    navHover: 'hover:bg-muted',
    menuItemActive: 'bg-primary/15 text-primary',
    menuItemInactive: 'text-foreground hover:bg-muted',
    menuItemMonolith: '',
    brandFallback: 'bg-primary/15 text-primary',
    brandLogoBg: 'bg-muted',
    themeToggleHover: 'hover:bg-muted',
    sectionBorder: '',
    sectionAlt: '',
    subheading: 'text-muted-foreground',
    body: 'text-muted-foreground',
    muted: 'text-muted-foreground',
    card: 'border-border/70 bg-card/60',
    cardBorder: 'border-border/70',
    highlightCard: 'border-border/70 bg-card/40',
    primaryBtn: 'bg-primary text-primary-foreground',
    secondaryBtn: 'border-border text-foreground border',
    heroSecondaryBtn:
      'border border-white/35 bg-white/10 text-white backdrop-blur hover:bg-white/20',
    testimonialCard: 'border-border/70 bg-card/60',
    testimonialFooter: 'text-muted-foreground',
    testimonialControl: 'border-border',
    mapPinBg: 'bg-muted',
    galleryFrame: '',
    galleryImageBorder: '',
    amenityCell:
      'border-border/70 bg-card/70 hover:border-primary/40 group hover:shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.55)]',
    ruleBorder: '',
    ruleText: 'text-muted-foreground',
    testimonialQuote: '',
    testimonialBlock: '',
    ctaSurface: 'from-primary/10 via-background to-background bg-gradient-to-br',
    progressInactive: 'bg-foreground/15 hover:bg-foreground/35',
    progressActive: 'bg-[hsl(var(--showcase-accent,var(--primary)))] h-10',
    marqueeBorder: 'border-white/15',
  },
  dark: {
    page: 'bg-slate-950 text-slate-50',
    header: 'border-slate-800 bg-slate-950/90 text-slate-50 backdrop-blur-md',
    headerSheet: 'border-slate-800 bg-slate-950/95 backdrop-blur-xl',
    footer: 'border-slate-800 bg-slate-950 text-slate-50',
    navActive: 'bg-primary/20 text-primary',
    navInactive: 'text-slate-400 hover:text-slate-100',
    navMonolithActive: '',
    navHover: 'hover:bg-slate-800',
    menuItemActive: 'bg-primary/20 text-primary',
    menuItemInactive: 'text-slate-100 hover:bg-slate-800',
    menuItemMonolith: '',
    brandFallback: 'bg-primary/20 text-primary',
    brandLogoBg: 'bg-slate-800',
    themeToggleHover: 'hover:bg-slate-800',
    sectionBorder: '',
    sectionAlt: '',
    subheading: 'text-slate-400',
    body: 'text-slate-300',
    muted: 'text-slate-400',
    card: 'border-slate-700/70 bg-slate-900/60',
    cardBorder: 'border-slate-700/70',
    highlightCard: 'border-slate-700 bg-slate-900/50',
    primaryBtn: 'bg-primary text-primary-foreground',
    secondaryBtn: 'border-slate-600 text-slate-100 border',
    heroSecondaryBtn:
      'border border-white/35 bg-white/10 text-white backdrop-blur hover:bg-white/20',
    testimonialCard: 'border-slate-700/70 bg-slate-900/60',
    testimonialFooter: 'text-slate-400',
    testimonialControl: 'border-slate-600',
    mapPinBg: 'bg-slate-800',
    galleryFrame: '',
    galleryImageBorder: '',
    amenityCell:
      'border-slate-700/70 bg-slate-900/70 hover:border-primary/40 group hover:shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.55)]',
    ruleBorder: '',
    ruleText: 'text-slate-400',
    testimonialQuote: '',
    testimonialBlock: '',
    ctaSurface: 'from-primary/15 via-slate-950 to-slate-950 bg-gradient-to-br',
    progressInactive: 'bg-slate-600/40 hover:bg-slate-500/60',
    progressActive: 'bg-[hsl(var(--showcase-accent,var(--primary)))] h-10',
    marqueeBorder: 'border-white/15',
  },
};

const MONOLITH: Record<ShowcaseColorMode, ShowcaseThemeTokens> = {
  light: {
    page: 'bg-stone-100 text-neutral-900',
    header: 'border-neutral-200 bg-stone-100/90 text-neutral-900 backdrop-blur-md',
    headerSheet: 'border-neutral-200 bg-stone-100/95 backdrop-blur-xl',
    footer: 'border-neutral-200 bg-stone-200/80 text-neutral-900',
    navActive: 'bg-transparent text-primary underline underline-offset-8',
    navInactive: 'text-neutral-500 hover:text-neutral-900',
    navMonolithActive: 'bg-transparent text-primary underline underline-offset-8',
    navHover: 'hover:bg-neutral-200/80',
    menuItemActive: 'bg-primary/10 text-primary',
    menuItemInactive: 'text-neutral-800 hover:bg-neutral-200/80',
    menuItemMonolith: 'rounded-none text-neutral-700 hover:bg-neutral-200/80',
    brandFallback: 'bg-neutral-900 text-neutral-50',
    brandLogoBg: 'bg-neutral-200',
    themeToggleHover: 'hover:bg-neutral-200/80',
    sectionBorder: 'border-neutral-200',
    sectionAlt: 'bg-stone-200/50',
    subheading: 'text-neutral-600',
    body: 'text-neutral-700',
    muted: 'text-neutral-500',
    card: 'border-neutral-200 bg-white/80',
    cardBorder: 'border-neutral-200',
    highlightCard: 'border-neutral-200 bg-white',
    primaryBtn: 'bg-primary text-primary-foreground',
    secondaryBtn: 'border-neutral-300 text-neutral-900 border',
    heroSecondaryBtn: 'border border-neutral-400/60 text-neutral-900 bg-white/40 backdrop-blur',
    testimonialCard: 'border border-neutral-200 bg-white/90',
    testimonialFooter: 'text-neutral-500',
    testimonialControl: 'border-neutral-300',
    mapPinBg: 'bg-stone-200',
    galleryFrame: 'border border-neutral-200',
    galleryImageBorder: 'rounded-none border-r border-neutral-200 last:border-r-0',
    amenityCell:
      'border-b border-neutral-200 @sm:odd:border-r min-h-14 px-5 py-4 uppercase tracking-[0.08em]',
    ruleBorder: 'border-b border-neutral-200',
    ruleText: 'text-neutral-600',
    testimonialQuote: 'font-instrument text-xl leading-snug @sm:text-2xl',
    testimonialBlock: 'border border-neutral-200 p-6',
    ctaSurface: '',
    progressInactive: '',
    progressActive: '',
    marqueeBorder: 'border-neutral-200',
  },
  dark: {
    page: 'bg-neutral-950 text-neutral-50',
    header: 'border-white/10 bg-neutral-950/90 text-neutral-50 backdrop-blur-md',
    headerSheet: 'border-white/10 bg-neutral-950/95 backdrop-blur-xl',
    footer: 'border-white/10 bg-neutral-950 text-neutral-50',
    navActive: 'bg-transparent text-primary underline underline-offset-8',
    navInactive: 'text-neutral-400 hover:text-neutral-100',
    navMonolithActive: 'bg-transparent text-primary underline underline-offset-8',
    navHover: 'hover:bg-white/10',
    menuItemActive: 'bg-primary/15 text-primary',
    menuItemInactive: 'text-neutral-200 hover:bg-white/10',
    menuItemMonolith: 'rounded-none text-neutral-200 hover:bg-white/10',
    brandFallback: 'bg-neutral-800 text-neutral-50',
    brandLogoBg: 'bg-neutral-800',
    themeToggleHover: 'hover:bg-white/10',
    sectionBorder: 'border-white/10',
    sectionAlt: 'bg-neutral-900/40',
    subheading: 'text-white/65',
    body: 'text-white/75',
    muted: 'text-white/55',
    card: 'border-white/15 bg-neutral-900/40',
    cardBorder: 'border-white/15',
    highlightCard: 'border-white/15 bg-neutral-900/30',
    primaryBtn: 'bg-primary text-primary-foreground',
    secondaryBtn: 'border-white/25 text-neutral-50 border',
    heroSecondaryBtn: 'border border-white/30 text-white',
    testimonialCard: 'border border-white/15',
    testimonialFooter: 'text-white/55',
    testimonialControl: 'border-white/20',
    mapPinBg: 'bg-neutral-900',
    galleryFrame: 'border border-white/15',
    galleryImageBorder: 'rounded-none border-r border-white/10 last:border-r-0',
    amenityCell:
      'border-b border-white/10 @sm:odd:border-r min-h-14 px-5 py-4 uppercase tracking-[0.08em]',
    ruleBorder: 'border-b border-white/10',
    ruleText: 'text-white/75',
    testimonialQuote: 'font-instrument text-xl leading-snug @sm:text-2xl',
    testimonialBlock: 'border border-white/15 p-6',
    ctaSurface: '',
    progressInactive: '',
    progressActive: '',
    marqueeBorder: 'border-white/15',
  },
};

const EDITORIAL: Record<ShowcaseColorMode, ShowcaseThemeTokens> = {
  light: {
    page: 'bg-[#f7f3ec] text-[#1c1917]',
    header: 'border-[#1c1917]/10 bg-[#f7f3ec]/90 text-[#1c1917] backdrop-blur-md',
    headerSheet: 'border-[#1c1917]/10 bg-[#f7f3ec]/95 backdrop-blur-xl',
    footer: 'border-[#1c1917]/10 bg-[#efe8dc] text-[#1c1917]',
    navActive: 'text-[#1c1917] underline decoration-[#1c1917]/35 underline-offset-8',
    navInactive: 'text-[#57534e] hover:text-[#1c1917]',
    navMonolithActive: '',
    navHover: 'hover:bg-[#1c1917]/5',
    menuItemActive: 'bg-[#1c1917]/10 text-[#1c1917]',
    menuItemInactive: 'text-[#1c1917] hover:bg-[#1c1917]/5',
    menuItemMonolith: '',
    brandFallback: 'bg-[#1c1917] text-[#f7f3ec]',
    brandLogoBg: 'bg-[#efe8dc]',
    themeToggleHover: 'hover:bg-[#1c1917]/5',
    sectionBorder: '',
    sectionAlt: '',
    subheading: 'text-[#57534e]',
    body: 'text-[#44403c]',
    muted: 'text-[#78716c]',
    card: 'bg-white/70',
    cardBorder: 'border-[#1c1917]/10',
    highlightCard: 'rounded-md bg-white/70',
    primaryBtn: 'bg-[#1c1917] text-[#f7f3ec]',
    secondaryBtn: 'border border-[#1c1917]/25 text-[#1c1917]',
    heroSecondaryBtn: 'border border-[#1c1917]/25 text-[#1c1917]',
    testimonialCard: 'rounded-md bg-white p-6 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)]',
    testimonialFooter: 'text-[#78716c]',
    testimonialControl: 'border-[#1c1917]/20',
    mapPinBg: 'bg-[#efe8dc]',
    galleryFrame: '',
    galleryImageBorder: '',
    amenityCell: 'text-[#44403c]',
    ruleBorder: '',
    ruleText: 'text-[#57534e]',
    testimonialQuote: 'font-cormorant text-2xl leading-snug text-[#1c1917] @sm:text-3xl',
    testimonialBlock: '',
    ctaSurface: '',
    progressInactive: '',
    progressActive: '',
    marqueeBorder: '',
  },
  dark: {
    page: 'bg-[#14110f] text-[#f5efe6]',
    header: 'border-[#f5efe6]/10 bg-[#14110f]/90 text-[#f5efe6] backdrop-blur-md',
    headerSheet: 'border-[#f5efe6]/10 bg-[#14110f]/95 backdrop-blur-xl',
    footer: 'border-[#f5efe6]/10 bg-[#1c1814] text-[#f5efe6]',
    navActive: 'text-[#f5efe6] underline decoration-[#f5efe6]/35 underline-offset-8',
    navInactive: 'text-[#a8a29e] hover:text-[#f5efe6]',
    navMonolithActive: '',
    navHover: 'hover:bg-[#f5efe6]/5',
    menuItemActive: 'bg-[#f5efe6]/10 text-[#f5efe6]',
    menuItemInactive: 'text-[#f5efe6] hover:bg-[#f5efe6]/5',
    menuItemMonolith: '',
    brandFallback: 'bg-[#f5efe6] text-[#14110f]',
    brandLogoBg: 'bg-[#252019]',
    themeToggleHover: 'hover:bg-[#f5efe6]/5',
    sectionBorder: '',
    sectionAlt: '',
    subheading: 'text-[#a8a29e]',
    body: 'text-[#d6d3d1]',
    muted: 'text-[#a8a29e]',
    card: 'bg-[#252019]',
    cardBorder: 'border-[#f5efe6]/10',
    highlightCard: 'rounded-md bg-[#252019]',
    primaryBtn: 'bg-[#f5efe6] text-[#14110f]',
    secondaryBtn: 'border border-[#f5efe6]/25 text-[#f5efe6]',
    heroSecondaryBtn: 'border border-[#f5efe6]/25 text-[#f5efe6]',
    testimonialCard: 'rounded-md bg-[#252019] p-6 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.45)]',
    testimonialFooter: 'text-[#a8a29e]',
    testimonialControl: 'border-[#f5efe6]/20',
    mapPinBg: 'bg-[#252019]',
    galleryFrame: '',
    galleryImageBorder: '',
    amenityCell: 'text-[#d6d3d1]',
    ruleBorder: '',
    ruleText: 'text-[#a8a29e]',
    testimonialQuote: 'font-cormorant text-2xl leading-snug text-[#f5efe6] @sm:text-3xl',
    testimonialBlock: '',
    ctaSurface: '',
    progressInactive: '',
    progressActive: '',
    marqueeBorder: '',
  },
};

const BY_VARIANT: Record<ShowcaseVariant, Record<ShowcaseColorMode, ShowcaseThemeTokens>> = {
  aurora: AURORA,
  monolith: MONOLITH,
  editorial: EDITORIAL,
};

export function getShowcaseThemeTokens(
  variant: ShowcaseVariant,
  mode: ShowcaseColorMode
): ShowcaseThemeTokens {
  return BY_VARIANT[variant][mode];
}

export function resolveShowcaseInitialMode(
  paletteMode: 'light' | 'dark' | 'warm'
): ShowcaseColorMode {
  if (paletteMode === 'dark') return 'dark';
  return 'light';
}

export function showcaseThemeStorageKey(propertySlug: string, variant: ShowcaseVariant): string {
  return `showcase-color-mode:${propertySlug}:${variant}`;
}
