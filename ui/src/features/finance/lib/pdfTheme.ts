/** Design tokens mirrored from `ui/src/index.css` (light theme). */

function hslToRgb(h: number, sPct: number, lPct: number): [number, number, number] {
  const s = sPct / 100;
  const l = lPct / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgb(h: number, s: number, l: number): [number, number, number] {
  return hslToRgb(h, s, l);
}

export const PDF_FONT = 'PJS';

export const PDF_LAYOUT = {
  margin: 14,
  contentRadius: 4,
  cardRadius: 3.5,
  /** After header card → period line */
  afterHeaderCard: 4,
  /** Period line → filter line */
  metaLine: 3.5,
  /** Filter block → next content (e.g. hero) */
  beforeBlock: 5,
  /** Major card/section → next section eyebrow */
  afterBlock: 7,
  /** Section eyebrow → subtitle */
  eyebrowToSubtitle: 4,
  /** Section title block → content (KPI grid, table) */
  afterSectionTitle: 5,
  /** Legacy alias — between minor stacked elements */
  gap: 4,
  sectionGap: 6,
} as const;

export const PDF_TYPE = {
  overline: 6.5,
  caption: 7.5,
  body: 9,
  data: 10,
  section: 11,
  title: 13,
  hero: 20,
} as const;

export const PDF_COLORS = {
  pageBg: rgb(150, 20, 98),
  card: [255, 255, 255] as [number, number, number],
  border: rgb(150, 12, 90),
  separator: rgb(150, 10, 86),
  foreground: rgb(160, 25, 14),
  muted: rgb(160, 10, 46),
  primary: rgb(168, 65, 40),
  primaryDark: rgb(168, 65, 32),
  primaryFg: [255, 255, 255] as [number, number, number],
  primarySubtle: rgb(168, 65, 96),
  secondary: rgb(152, 30, 94),
  success: rgb(152, 69, 38),
  warning: rgb(38, 92, 50),
  destructive: rgb(0, 72, 51),
  shadow: rgb(160, 20, 20),
  tableHeadBg: rgb(168, 65, 96),
  tableHeadText: rgb(168, 65, 28),
  tableStripe: rgb(150, 15, 97),
  tableFoot: rgb(152, 30, 94),
} as const;

export function setPdfFill(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number],
): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function setPdfDraw(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number],
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function setPdfText(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number],
): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Simulated elevated card shadow (offset layer + card). */
export function drawCardShadow(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  setPdfFill(doc, PDF_COLORS.shadow);
  doc.roundedRect(x + 0.6, y + 0.9, w, h, r, r, 'F');
}

export function drawCard(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options?: { shadow?: boolean; fill?: readonly [number, number, number] },
): void {
  if (options?.shadow !== false) {
    drawCardShadow(doc, x, y, w, h, r);
  }
  setPdfFill(doc, options?.fill ?? PDF_COLORS.card);
  setPdfDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, r, r, 'FD');
}
