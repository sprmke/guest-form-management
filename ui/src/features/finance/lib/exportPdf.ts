import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import type {
  FinanceBookingLedgerRow,
  FinanceExportType,
  FinanceLineItem,
  FinanceQuery,
  FinanceSummary,
} from '@/features/finance/lib/types';
import {
  financeBasisLabel,
  financePeriodRangeLabel,
  financePresetLabel,
} from '@/features/finance/lib/financeFilterLabels';
import { pdfBookingDate, pdfIsoDate, pdfMoney } from '@/features/finance/lib/pdfFormatters';
import { registerPdfFonts, setPdfFont } from '@/features/finance/lib/pdfFonts';
import {
  PDF_COLORS,
  PDF_FONT,
  PDF_LAYOUT,
  PDF_TYPE,
  drawCard,
  setPdfDraw,
  setPdfFill,
  setPdfText,
} from '@/features/finance/lib/pdfTheme';

const REPORT_TYPE_LABEL: Record<FinanceExportType, string> = {
  combined: 'Full finance report',
  overview: 'Overview summary',
  stays: 'Stays ledger',
  operating: 'Transactions',
};

function paintPageBackground(doc: jsPDF): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  setPdfFill(doc, PDF_COLORS.pageBg);
  doc.rect(0, 0, w, h, 'F');
}

function startNewPage(doc: jsPDF): number {
  doc.addPage();
  paintPageBackground(doc);
  return PDF_LAYOUT.margin;
}

function contentWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth() - PDF_LAYOUT.margin * 2;
}

function lastTableY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;
}

function ensurePageSpace(doc: jsPDF, y: number, minBottom = 48): number {
  if (y > doc.internal.pageSize.getHeight() - minBottom) {
    return startNewPage(doc);
  }
  return y;
}

const TABLE_MARGIN = {
  left: PDF_LAYOUT.margin,
  right: PDF_LAYOUT.margin,
  top: PDF_LAYOUT.margin,
  bottom: 18,
};

const TABLE_STYLES = {
  font: PDF_FONT,
  fontSize: 7.5,
  cellPadding: 2.5,
  textColor: PDF_COLORS.foreground,
  lineColor: PDF_COLORS.border,
  lineWidth: 0.1,
  overflow: 'linebreak' as const,
};

/** Right-aligned money cells — plain decimals, no currency prefix. */
const PDF_TABLE_MONEY_COLUMN = {
  halign: 'right' as const,
  overflow: 'visible' as const,
  fontSize: 7,
  cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 1.5 },
};

function drawReportHeader(
  doc: jsPDF,
  query: FinanceQuery,
  exportType: FinanceExportType,
): number {
  const m = PDF_LAYOUT.margin;
  const w = doc.internal.pageSize.getWidth();
  const cardW = w - m * 2;
  const cardY = 10;
  const cardH = 24;

  drawCard(doc, m, cardY, cardW, cardH, PDF_LAYOUT.cardRadius, { shadow: false });

  const badgeSize = 10;
  const badgeX = m + 4;
  const badgeY = cardY + (cardH - badgeSize) / 2;
  setPdfFill(doc, PDF_COLORS.primary);
  doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2, 2, 'F');
  setPdfText(doc, PDF_COLORS.primaryFg);
  setPdfFont(doc, 'bold', 7.5);
  doc.text('KH', badgeX + badgeSize / 2, badgeY + 6.8, { align: 'center' });

  const textX = badgeX + badgeSize + 4;
  setPdfText(doc, PDF_COLORS.foreground);
  setPdfFont(doc, 'bold', PDF_TYPE.title);
  doc.text('Kame Homes', textX, cardY + 10);

  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);
  doc.text(REPORT_TYPE_LABEL[exportType], textX, cardY + 16);

  const generated = format(new Date(), "MMM d, yyyy 'at' h:mm a");
  doc.text(generated, m + cardW - 4, cardY + 10, { align: 'right' });
  doc.text('Finance', m + cardW - 4, cardY + 16, { align: 'right' });

  const preset = financePresetLabel(query);
  const range = financePeriodRangeLabel(query.from, query.to);
  const basis = financeBasisLabel(query.basis);

  let y = cardY + cardH + PDF_LAYOUT.afterHeaderCard;

  setPdfFont(doc, 'bold', PDF_TYPE.section);
  setPdfText(doc, PDF_COLORS.foreground);
  doc.text(preset ? `${preset} · ${range}` : range, m, y);

  y += PDF_LAYOUT.metaLine;
  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);
  const filterParts = [`Grouped by ${basis.toLowerCase()}`];
  if (query.completedOnly && query.basis !== 'completed') {
    filterParts.push('Completed stays only');
  }
  if (query.includeCancelled) filterParts.push('Includes cancelled');
  if (query.q.trim()) filterParts.push(`Search: "${query.q.trim()}"`);
  doc.text(filterParts.join(' · '), m, y);

  return y + PDF_LAYOUT.beforeBlock;
}

type KpiItem = {
  label: string;
  value: string;
  accent?: 'positive' | 'negative' | 'neutral';
};

function accentRgb(accent: 'positive' | 'negative' | 'neutral'): readonly [number, number, number] {
  if (accent === 'positive') return PDF_COLORS.success;
  if (accent === 'negative') return PDF_COLORS.destructive;
  return PDF_COLORS.foreground;
}

function drawSectionEyebrow(doc: jsPDF, y: number, title: string, subtitle?: string): number {
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

function drawHeroNet(doc: jsPDF, y: number, grandNet: number): number {
  const m = PDF_LAYOUT.margin;
  const boxW = contentWidth(doc);
  const boxH = 26;
  const valueColor = grandNet >= 0 ? PDF_COLORS.success : PDF_COLORS.destructive;

  drawCard(doc, m, y, boxW, boxH, PDF_LAYOUT.contentRadius, {
    fill: PDF_COLORS.primarySubtle,
    shadow: false,
  });

  setPdfFill(doc, PDF_COLORS.primary);
  doc.roundedRect(m, y, 3, boxH, 1, 1, 'F');

  setPdfFont(doc, 'bold', PDF_TYPE.overline);
  setPdfText(doc, PDF_COLORS.primaryDark);
  doc.text('TOTAL NET', m + 7, y + 10);

  setPdfFont(doc, 'bold', PDF_TYPE.hero);
  setPdfText(doc, valueColor);
  doc.text(pdfMoney(grandNet), m + 7, y + 21);

  return y + boxH + PDF_LAYOUT.afterBlock;
}

function drawKpiGrid(doc: jsPDF, y: number, items: KpiItem[], cols = 3): number {
  const m = PDF_LAYOUT.margin;
  const boxW = contentWidth(doc);
  const colW = boxW / cols;
  const rowH = 20;
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
    const labelLines = doc.splitTextToSize(item.label.toUpperCase(), cardW - 5);
    doc.text(labelLines.slice(0, 2), x + 3, itemY + 6);

    const c = accentRgb(item.accent ?? 'neutral');
    setPdfFont(doc, 'bold', PDF_TYPE.data);
    setPdfText(doc, c);
    const valueLines = doc.splitTextToSize(item.value, cardW - 5);
    doc.text(valueLines[0], x + 3, itemY + 15);
  });

  const rows = Math.ceil(items.length / cols);
  return y + rows * (rowH + gap) + PDF_LAYOUT.sectionGap;
}

function appendOverviewSection(doc: jsPDF, y: number, payload: FinancePdfPayload): number {
  const { summary } = payload;
  const { stays: s, operating: o, grandNet } = summary;

  y = drawHeroNet(doc, y, grandNet);

  y = drawSectionEyebrow(doc, y, 'Summary', 'Key metrics for the selected period');
  const overviewKpis: KpiItem[] = [
    {
      label: 'Completed net',
      value: pdfMoney(s.hostNetCompleted),
      accent: s.hostNetCompleted >= 0 ? 'positive' : 'negative',
    },
    { label: 'Total booking rates', value: pdfMoney(s.bookingRate) },
    { label: 'Additional fees', value: pdfMoney(s.otherFees) },
    {
      label: 'Outstanding balance',
      value: pdfMoney(s.outstandingGuestBalance),
      accent: s.outstandingGuestBalance > 0 ? 'negative' : 'neutral',
    },
    { label: 'Stays in period', value: String(s.count) },
    { label: 'Completed stays', value: String(s.completedCount) },
    {
      label: 'Transactions net',
      value: pdfMoney(o.net),
      accent: o.net >= 0 ? 'positive' : 'negative',
    },
    { label: 'Transactions income', value: pdfMoney(o.income), accent: 'positive' },
    { label: 'Transactions expenses', value: pdfMoney(o.expenses), accent: 'negative' },
  ];
  if (s.projectedNetPipeline !== 0) {
    overviewKpis.push({
      label: 'Pipeline estimate',
      value: pdfMoney(s.projectedNetPipeline),
      accent: s.projectedNetPipeline >= 0 ? 'positive' : 'negative',
    });
  }
  return drawKpiGrid(doc, y, overviewKpis);
}

function appendStaysSection(doc: jsPDF, y: number, payload: FinancePdfPayload): number {
  const { summary, stays } = payload;
  const s = summary.stays;
  const tableW = contentWidth(doc);

  y = drawSectionEyebrow(
    doc,
    y,
    'Stays',
    `${stays.length} stay${stays.length === 1 ? '' : 's'} in period`,
  );

  const stayRows = stays.map((row) => {
    const fin = row.financials;
    const net = fin.isCompleted ? fin.hostNet : fin.projectedNet;
    const guest = row.guest_facebook_name || row.primary_guest_name || '-';
    const netLabel = fin.isCompleted
      ? pdfMoney(net ?? 0)
      : `${pdfMoney(net ?? 0)} est`;
    return [
      guest,
      pdfBookingDate(row.check_in_date),
      pdfBookingDate(row.check_out_date),
      statusLabel(row.status),
      pdfMoney(fin.bookingRate),
      pdfMoney(fin.otherFees),
      netLabel,
    ];
  });

  const completedNetTotal = stays.reduce((acc, row) => {
    if (!row.financials.isCompleted) return acc;
    return acc + (row.financials.hostNet ?? 0);
  }, 0);

  function netColumnTextColor(
    isCompleted: boolean,
    net: number | null | undefined,
  ): [number, number, number] {
    if (!isCompleted) return [...PDF_COLORS.warning];
    return (net ?? 0) >= 0 ? [...PDF_COLORS.success] : [...PDF_COLORS.destructive];
  }

  autoTable(doc, {
    startY: y,
    tableWidth: tableW,
    head: [
      [
        'Guest',
        'Check-in',
        'Check-out',
        'Status',
        'Booking rate',
        'Additional fees',
        'Host net',
      ],
    ],
    body:
      stayRows.length > 0
        ? stayRows
        : [['No stays match the selected filters.', '', '', '', '', '', '']],
    foot:
      stayRows.length > 0
        ? [
            [
              'Totals',
              '',
              '',
              '',
              pdfMoney(s.bookingRate),
              pdfMoney(s.otherFees),
              pdfMoney(completedNetTotal),
            ],
          ]
        : undefined,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    margin: TABLE_MARGIN,
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: PDF_COLORS.tableHeadBg,
      textColor: PDF_COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: PDF_TYPE.overline,
      halign: 'left',
    },
    footStyles: {
      fillColor: PDF_COLORS.tableFoot,
      textColor: PDF_COLORS.foreground,
      fontStyle: 'bold',
      fontSize: PDF_TYPE.caption,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    columnStyles: {
      0: { cellWidth: tableW * 0.27, overflow: 'ellipsize' },
      1: { cellWidth: tableW * 0.1, halign: 'center' },
      2: { cellWidth: tableW * 0.1, halign: 'center' },
      3: { cellWidth: tableW * 0.16, overflow: 'ellipsize' },
      4: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.13 },
      5: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.12 },
      6: {
        ...PDF_TABLE_MONEY_COLUMN,
        cellWidth: tableW * 0.12,
        fontStyle: 'bold',
      },
    },
    didParseCell: (data) => {
      const moneyCol = data.column.index >= 4 && data.column.index <= 6;
      if (!moneyCol) return;

      if (data.section === 'body' || data.section === 'foot') {
        data.cell.styles.overflow = 'visible';
        data.cell.styles.halign = 'right';
      }

      if (data.column.index !== 6) return;

      if (data.section === 'body') {
        const row = stays[data.row.index];
        if (!row) return;
        const fin = row.financials;
        const net = fin.isCompleted ? fin.hostNet : fin.projectedNet;
        data.cell.styles.fontStyle = fin.isCompleted ? 'bold' : 'normal';
        data.cell.styles.textColor = netColumnTextColor(fin.isCompleted, net);
        return;
      }

      if (data.section === 'foot') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = netColumnTextColor(true, completedNetTotal);
      }
    },
  });

  return lastTableY(doc, y) + PDF_LAYOUT.afterBlock;
}

function appendOperatingSection(doc: jsPDF, y: number, payload: FinancePdfPayload): number {
  const { operating } = payload;
  const tableW = contentWidth(doc);

  y = ensurePageSpace(doc, y);

  const incomeTotal = operating
    .filter((i) => i.kind === 'income')
    .reduce((a, i) => a + i.amount, 0);
  const expenseTotal = operating
    .filter((i) => i.kind === 'expense')
    .reduce((a, i) => a + i.amount, 0);
  const operatingNet = incomeTotal - expenseTotal;

  y = drawSectionEyebrow(
    doc,
    y,
    'Transactions',
    `${operating.length} transaction${operating.length === 1 ? '' : 's'} in period`,
  );

  y = drawKpiGrid(
    doc,
    y,
    [
      { label: 'Income', value: pdfMoney(incomeTotal), accent: 'positive' },
      { label: 'Expenses', value: pdfMoney(expenseTotal), accent: 'negative' },
      {
        label: 'Transactions net',
        value: pdfMoney(operatingNet),
        accent: operatingNet >= 0 ? 'positive' : 'negative',
      },
    ],
    3,
  );

  const opRows = operating.map((item) => {
    const amt = pdfMoney(Math.abs(item.amount));
    return [
      pdfIsoDate(item.occurred_on),
      item.kind === 'income' ? 'Income' : 'Expense',
      item.label,
      item.category ?? '-',
      item.kind === 'income' ? `+${amt}` : `-${amt}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    tableWidth: tableW,
    head: [['Date', 'Type', 'Label', 'Category', 'Amount']],
    body:
      opRows.length > 0
        ? opRows
        : [['No transactions in this period.', '', '', '', '']],
    foot:
      opRows.length > 0
        ? [
            [
              'Totals',
              '',
              '',
              '',
              `${operatingNet >= 0 ? '+' : '-'}${pdfMoney(Math.abs(operatingNet))}`,
            ],
          ]
        : undefined,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    margin: TABLE_MARGIN,
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: PDF_COLORS.tableHeadBg,
      textColor: PDF_COLORS.tableHeadText,
      fontStyle: 'bold',
      fontSize: PDF_TYPE.overline,
    },
    footStyles: {
      fillColor: PDF_COLORS.tableFoot,
      textColor: PDF_COLORS.foreground,
      fontStyle: 'bold',
      fontSize: PDF_TYPE.caption,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    columnStyles: {
      0: { cellWidth: tableW * 0.16 },
      1: { cellWidth: tableW * 0.12 },
      2: { cellWidth: tableW * 0.34 },
      3: { cellWidth: tableW * 0.18 },
      4: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.2, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const kind = String(data.cell.raw);
        if (kind === 'Income') {
          data.cell.styles.textColor = PDF_COLORS.success;
        } else if (kind === 'Expense') {
          data.cell.styles.textColor = PDF_COLORS.destructive;
        }
      }
      if (data.section === 'body' && data.column.index === 4) {
        const raw = String(data.cell.raw);
        if (raw.startsWith('+')) {
          data.cell.styles.textColor = PDF_COLORS.success;
        } else if (raw.startsWith('-')) {
          data.cell.styles.textColor = PDF_COLORS.destructive;
        }
      }
    },
  });

  return lastTableY(doc, y) + PDF_LAYOUT.afterBlock;
}

function appendReportDefinitions(doc: jsPDF, y: number): number {
  const m = PDF_LAYOUT.margin;
  const noteW = contentWidth(doc);

  y = ensurePageSpace(doc, y, 52);
  y = drawSectionEyebrow(doc, y, 'Definitions', 'How ledger and breakdown figures are calculated');

  const lines = [
    'All amounts are Philippine pesos (PHP) without a currency prefix in tables.',
    'Booking rate = down payment + guest balance (booking rate − down payment).',
    'Additional fees = pet fee + parking margin + additional guest fee + (security deposit − SD refund) when the stay is completed or an SD refund amount is recorded.',
    'Host net (completed) = booking rate + additional fees. In-progress host net (EST) may exceed booking rate + additional fees while security deposit is still held. Breakdown net matches full income minus expenses including SD.',
    'Total net = sum of completed host net plus transactions net for this period. Pipeline estimates exclude SD refund until the stay is completed.',
  ];

  setPdfFont(doc, 'normal', PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);

  for (const line of lines) {
    y = ensurePageSpace(doc, y, 14);
    const wrapped = doc.splitTextToSize(`• ${line}`, noteW);
    doc.text(wrapped, m, y);
    y += wrapped.length * 3.8 + 1.5;
  }

  return y + PDF_LAYOUT.afterBlock;
}

function addPageFooter(doc: jsPDF) {
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
    doc.text('Kame Homes · Finance', m, pageH - 8);
    doc.text(`Page ${i} of ${pages}`, pageW - m, pageH - 8, { align: 'right' });
  }
}

const PDF_FILENAME_PREFIX: Record<FinanceExportType, string> = {
  overview: 'kame-finance-overview',
  stays: 'kame-finance-stays',
  operating: 'kame-finance-transactions',
  combined: 'kame-finance-report',
};

export type FinancePdfPayload = {
  query: FinanceQuery;
  summary: FinanceSummary;
  stays: FinanceBookingLedgerRow[];
  operating: FinanceLineItem[];
};

export async function buildFinanceReportPdf(
  payload: FinancePdfPayload,
  type: FinanceExportType = 'combined',
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerPdfFonts(doc);
  paintPageBackground(doc);

  let y = drawReportHeader(doc, payload.query, type);

  if (type === 'overview' || type === 'combined') {
    y = appendOverviewSection(doc, y, payload);
  }

  if (type === 'stays' || type === 'combined') {
    if (type === 'combined') {
      y = startNewPage(doc);
    } else {
      y = ensurePageSpace(doc, y, 80);
    }
    y = appendStaysSection(doc, y, payload);
  }

  if (type === 'operating' || type === 'combined') {
    y = ensurePageSpace(doc, y, 70);
    y = appendOperatingSection(doc, y, payload);
  }

  if (type === 'combined' || type === 'overview') {
    y = appendReportDefinitions(doc, y);
  }

  addPageFooter(doc);
  return doc;
}

export async function downloadFinanceReportPdf(
  payload: FinancePdfPayload,
  type: FinanceExportType = 'combined',
): Promise<void> {
  const doc = await buildFinanceReportPdf(payload, type);
  const from = payload.query.from ?? 'all';
  const to = payload.query.to ?? 'all';
  const prefix = PDF_FILENAME_PREFIX[type];
  doc.save(`${prefix}_${from}_${to}.pdf`);
}
