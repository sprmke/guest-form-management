import { format } from 'date-fns';
import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';

import { setPdfFont } from '@/lib/pdf/pdfFonts';
import {
  PDF_COLORS,
  PDF_FONT,
  PDF_LAYOUT,
  PDF_TYPE,
  drawCard,
  setPdfDraw,
  setPdfFill,
  setPdfText,
} from '@/lib/pdf/pdfTheme';

export const PDF_TABLE_MARGIN = {
  left: PDF_LAYOUT.margin,
  right: PDF_LAYOUT.margin,
  top: PDF_LAYOUT.margin,
  bottom: 18,
} as const;

export const PDF_TABLE_STYLES: Partial<UserOptions['styles']> = {
  font: PDF_FONT,
  fontSize: 7.5,
  cellPadding: { top: 2.8, right: 2.5, bottom: 2.8, left: 2.5 },
  textColor: PDF_COLORS.foreground,
  lineColor: PDF_COLORS.border,
  lineWidth: 0.1,
  overflow: 'linebreak',
  valign: 'middle',
};

export const PDF_TABLE_HEAD_STYLES: Partial<UserOptions['headStyles']> = {
  fillColor: PDF_COLORS.tableHeadBg,
  textColor: PDF_COLORS.tableHeadText,
  fontStyle: 'bold',
  fontSize: PDF_TYPE.overline,
  halign: 'left',
  cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
};

export const PDF_TABLE_FOOT_STYLES: Partial<UserOptions['footStyles']> = {
  fillColor: PDF_COLORS.tableFoot,
  textColor: PDF_COLORS.foreground,
  fontStyle: 'bold',
  fontSize: PDF_TYPE.caption,
};

export const PDF_TABLE_MONEY_COLUMN = {
  halign: 'right' as const,
  overflow: 'visible' as const,
  fontSize: 7,
  cellPadding: { top: 2.8, right: 2, bottom: 2.8, left: 1.5 },
};

export type PdfKpiAccent = 'positive' | 'negative' | 'neutral';

export type PdfKpiItem = {
  label: string;
  value: string;
  accent?: PdfKpiAccent;
};

export type PdfReportHeaderOptions = {
  moduleLabel: string;
  reportTypeLabel: string;
  periodLine: string;
  metaLines?: string[];
};

export function paintPageBackground(doc: jsPDF): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  setPdfFill(doc, PDF_COLORS.pageBg);
  doc.rect(0, 0, w, h, 'F');
}

export function startNewPage(doc: jsPDF): number {
  doc.addPage();
  paintPageBackground(doc);
  return PDF_LAYOUT.margin;
}

export function contentWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth() - PDF_LAYOUT.margin * 2;
}

export function lastTableY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;
}

export function ensurePageSpace(doc: jsPDF, y: number, minBottom = 48): number {
  if (y > doc.internal.pageSize.getHeight() - minBottom) {
    return startNewPage(doc);
  }
  return y;
}

function accentRgb(accent: PdfKpiAccent): readonly [number, number, number] {
  if (accent === 'positive') return PDF_COLORS.success;
  if (accent === 'negative') return PDF_COLORS.destructive;
  return PDF_COLORS.foreground;
}

export function drawReportHeader(doc: jsPDF, options: PdfReportHeaderOptions): number {
  const m = PDF_LAYOUT.margin;
  const w = doc.internal.pageSize.getWidth();
  const cardW = w - m * 2;
  const cardY = 10;
  const cardH = 22;

  setPdfFill(doc, PDF_COLORS.primary);
  doc.rect(0, 0, w, 2.5, 'F');

  drawCard(doc, m, cardY, cardW, cardH, PDF_LAYOUT.cardRadius, { shadow: false });

  const badgeSize = 9;
  const badgeX = m + 4;
  const badgeY = cardY + (cardH - badgeSize) / 2;
  setPdfFill(doc, PDF_COLORS.primary);
  doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2, 2, 'F');
  setPdfText(doc, PDF_COLORS.primaryFg);
  setPdfFont(doc, 'bold', 7);
  doc.text('KH', badgeX + badgeSize / 2, badgeY + 6.2, { align: 'center' });

  const textX = badgeX + badgeSize + 4;
  setPdfText(doc, PDF_COLORS.foreground);
  setPdfFont(doc, 'bold', PDF_TYPE.title);
  doc.text('Kame Homes', textX, cardY + 9.5);

  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);
  doc.text(options.reportTypeLabel, textX, cardY + 15);

  const generated = format(new Date(), "MMM d, yyyy 'at' h:mm a");
  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);
  doc.text(generated, m + cardW - 4, cardY + 9.5, { align: 'right' });
  setPdfFont(doc, 'bold', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.foreground);
  doc.text(options.moduleLabel, m + cardW - 4, cardY + 15, { align: 'right' });

  let y = cardY + cardH + PDF_LAYOUT.afterHeaderCard;

  setPdfFont(doc, 'bold', PDF_TYPE.section);
  setPdfText(doc, PDF_COLORS.foreground);
  doc.text(options.periodLine, m, y);

  for (const line of options.metaLines ?? []) {
    y += PDF_LAYOUT.metaLine;
    setPdfFont(doc, 'normal', PDF_TYPE.caption);
    setPdfText(doc, PDF_COLORS.muted);
    doc.text(line, m, y);
  }

  return y + PDF_LAYOUT.beforeBlock;
}

export function drawSectionEyebrow(
  doc: jsPDF,
  y: number,
  title: string,
  subtitle?: string
): number {
  const m = PDF_LAYOUT.margin;
  setPdfFont(doc, 'bold', PDF_TYPE.overline);
  setPdfText(doc, PDF_COLORS.primary);
  doc.text(title.toUpperCase(), m, y);

  if (subtitle) {
    y += PDF_LAYOUT.eyebrowToSubtitle;
    setPdfFont(doc, 'bold', PDF_TYPE.body);
    setPdfText(doc, PDF_COLORS.foreground);
    doc.text(subtitle, m, y);
    y += PDF_LAYOUT.afterSectionTitle;
  } else {
    y += PDF_LAYOUT.afterSectionTitle;
  }

  return y;
}

export function drawHeroMetric(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  valueColor: readonly [number, number, number]
): number {
  const m = PDF_LAYOUT.margin;
  const boxW = contentWidth(doc);
  const boxH = 24;

  drawCard(doc, m, y, boxW, boxH, PDF_LAYOUT.contentRadius, {
    fill: PDF_COLORS.primarySubtle,
    shadow: false,
  });

  setPdfFill(doc, PDF_COLORS.primary);
  doc.roundedRect(m, y, 2.5, boxH, 1, 1, 'F');

  setPdfFont(doc, 'bold', PDF_TYPE.overline);
  setPdfText(doc, PDF_COLORS.primaryDark);
  doc.text(label.toUpperCase(), m + 7, y + 9.5);

  setPdfFont(doc, 'bold', PDF_TYPE.hero);
  setPdfText(doc, valueColor);
  doc.text(value, m + 7, y + 19.5);

  return y + boxH + PDF_LAYOUT.afterBlock;
}

export function drawKpiGrid(doc: jsPDF, y: number, items: PdfKpiItem[], cols = 3): number {
  const m = PDF_LAYOUT.margin;
  const boxW = contentWidth(doc);
  const colW = boxW / cols;
  const rowH = 21;
  const gap = 2.5;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = m + col * colW;
    const itemY = y + row * (rowH + gap);
    const cardW = colW - gap;

    drawCard(doc, x, itemY, cardW, rowH, 2, { shadow: false });

    setPdfFont(doc, 'bold', PDF_TYPE.overline);
    setPdfText(doc, PDF_COLORS.muted);
    const labelLines = doc.splitTextToSize(item.label.toUpperCase(), cardW - 6);
    doc.text(labelLines.slice(0, 2), x + 3.5, itemY + 6.5);

    const c = accentRgb(item.accent ?? 'neutral');
    setPdfFont(doc, 'bold', PDF_TYPE.data);
    setPdfText(doc, c);
    const valueLines = doc.splitTextToSize(item.value, cardW - 6);
    doc.text(valueLines[0], x + 3.5, itemY + 16);
  });

  const rows = Math.ceil(items.length / cols);
  return y + rows * (rowH + gap) + PDF_LAYOUT.sectionGap;
}

export function drawBulletNotes(doc: jsPDF, y: number, lines: string[]): number {
  const m = PDF_LAYOUT.margin;
  const noteW = contentWidth(doc);

  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);

  for (const line of lines) {
    y = ensurePageSpace(doc, y, 14);
    const wrapped = doc.splitTextToSize(`• ${line}`, noteW);
    doc.text(wrapped, m, y);
    y += wrapped.length * 3.6 + 1.5;
  }

  return y + PDF_LAYOUT.afterBlock;
}

export function addPageFooter(doc: jsPDF, moduleLabel: string): void {
  const pages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const m = PDF_LAYOUT.margin;

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setPdfDraw(doc, PDF_COLORS.separator);
    doc.setLineWidth(0.15);
    doc.line(m, pageH - 12, pageW - m, pageH - 12);

    setPdfFont(doc, 'normal', PDF_TYPE.caption);
    setPdfText(doc, PDF_COLORS.muted);
    doc.text(`Kame Homes · ${moduleLabel}`, m, pageH - 8);
    doc.text(`Page ${i} of ${pages}`, pageW - m, pageH - 8, { align: 'right' });
  }
}

export function baseAutoTableOptions(tableW: number): Partial<UserOptions> {
  return {
    tableWidth: tableW,
    margin: PDF_TABLE_MARGIN,
    styles: PDF_TABLE_STYLES,
    headStyles: PDF_TABLE_HEAD_STYLES,
    footStyles: PDF_TABLE_FOOT_STYLES,
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    showHead: 'everyPage',
    showFoot: 'lastPage',
  };
}
