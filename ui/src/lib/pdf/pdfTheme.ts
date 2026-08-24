/** Design tokens mirrored from `ui/src/index.css` (`:root` light theme). */

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
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgb(h: number, s: number, l: number): [number, number, number] {
  return hslToRgb(h, s, l);
}

export const PDF_FONT = 'PJS';

export const PDF_LAYOUT = {
  margin: 14,
  contentRadius: 4,
  cardRadius: 3,
  afterHeaderCard: 5,
  metaLine: 3.5,
  beforeBlock: 6,
  afterBlock: 8,
  eyebrowToSubtitle: 3.5,
  afterSectionTitle: 5,
  gap: 4,
  sectionGap: 7,
} as const;

export const PDF_TYPE = {
  overline: 6.5,
  caption: 7.5,
  body: 9,
  data: 10,
  section: 11,
  title: 12.5,
  hero: 19,
} as const;

export const PDF_COLORS = {
  pageBg: rgb(220, 18, 97),
  card: [255, 255, 255] as [number, number, number],
  border: rgb(220, 13, 91),
  separator: rgb(220, 13, 91),
  foreground: rgb(224, 71, 4),
  muted: rgb(220, 9, 46),
  primary: rgb(168, 65, 40),
  primaryDark: rgb(168, 65, 28),
  primaryFg: [255, 255, 255] as [number, number, number],
  primarySubtle: rgb(168, 55, 92),
  secondary: rgb(220, 14, 96),
  success: rgb(168, 65, 40),
  warning: rgb(43, 96, 56),
  destructive: rgb(0, 84, 60),
  shadow: rgb(224, 71, 4),
  tableHeadBg: rgb(168, 55, 94),
  tableHeadText: rgb(168, 65, 28),
  tableStripe: rgb(220, 14, 98),
  tableFoot: rgb(220, 14, 96),
} as const;

export function setPdfFill(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number]
): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function setPdfDraw(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number]
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function setPdfText(
  doc: import('jspdf').jsPDF,
  color: readonly [number, number, number]
): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawCardShadow(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  setPdfFill(doc, PDF_COLORS.tableStripe);
  doc.roundedRect(x + 0.35, y + 0.5, w, h, r, r, 'F');
}

export function drawCard(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options?: { shadow?: boolean; fill?: readonly [number, number, number] }
): void {
  if (options?.shadow !== false) {
    drawCardShadow(doc, x, y, w, h, r);
  }
  setPdfFill(doc, options?.fill ?? PDF_COLORS.card);
  setPdfDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, r, r, 'FD');
}
