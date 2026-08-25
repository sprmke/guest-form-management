import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  financePeriodRangeLabel,
  financePresetLabel,
} from '@/features/dashboard/finance/lib/financeFilterLabels';
import type {
  FinanceBookingLedgerRow,
  FinanceExportType,
  FinanceLineItem,
  FinanceQuery,
  FinanceSummary,
} from '@/features/dashboard/finance/lib/types';

import { registerPdfFonts } from '@/lib/pdf/pdfFonts';
import { pdfBookingDate, pdfIsoDate, pdfMoney } from '@/lib/pdf/pdfFormatters';
import {
  PDF_TABLE_MONEY_COLUMN,
  addPageFooter,
  baseAutoTableOptions,
  contentWidth,
  drawBulletNotes,
  drawHeroMetric,
  drawKpiGrid,
  drawReportHeader,
  drawSectionEyebrow,
  ensurePageSpace,
  lastTableY,
  paintPageBackground,
  startNewPage,
  type PdfKpiItem,
} from '@/lib/pdf/pdfReportLayout';
import { PDF_COLORS } from '@/lib/pdf/pdfTheme';

const REPORT_TYPE_LABEL: Record<FinanceExportType, string> = {
  combined: 'Full finance report',
  overview: 'Overview summary',
  stays: 'Stays ledger',
  operating: 'Transactions',
};

function netColumnTextColor(
  isCompleted: boolean,
  net: number | null | undefined
): [number, number, number] {
  if (!isCompleted) return [...PDF_COLORS.warning];
  return (net ?? 0) >= 0 ? [...PDF_COLORS.success] : [...PDF_COLORS.destructive];
}

function buildFinanceHeaderMeta(query: FinanceQuery): string[] {
  const filterParts = ['Grouped by check-in date'];
  if (query.includeCancelled) filterParts.push('Includes cancelled');
  if (query.q.trim()) filterParts.push(`Search: "${query.q.trim()}"`);
  return [filterParts.join(' · ')];
}

function appendOverviewSection(doc: jsPDF, y: number, payload: FinancePdfPayload): number {
  const { summary } = payload;
  const { stays: s, operating: o, grandNet } = summary;

  y = drawHeroMetric(
    doc,
    y,
    'Total net',
    pdfMoney(grandNet),
    grandNet >= 0 ? PDF_COLORS.success : PDF_COLORS.destructive
  );

  y = drawSectionEyebrow(doc, y, 'Summary', 'Key metrics for the selected period');
  const overviewKpis: PdfKpiItem[] = [
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
    `${stays.length} stay${stays.length === 1 ? '' : 's'} in period`
  );

  const stayRows = stays.map((row) => {
    const fin = row.financials;
    const net = fin.isCompleted ? fin.hostNet : fin.projectedNet;
    const guest = row.guest_facebook_name || row.primary_guest_name || '-';
    const netLabel = fin.isCompleted ? pdfMoney(net ?? 0) : `${pdfMoney(net ?? 0)} est`;
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

  autoTable(doc, {
    ...baseAutoTableOptions(tableW),
    startY: y,
    head: [
      ['Guest', 'Check-in', 'Check-out', 'Status', 'Booking rate', 'Additional fees', 'Host net'],
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
    columnStyles: {
      0: { cellWidth: tableW * 0.27, overflow: 'ellipsize' },
      1: { cellWidth: tableW * 0.1, halign: 'center' },
      2: { cellWidth: tableW * 0.1, halign: 'center' },
      3: { cellWidth: tableW * 0.16, overflow: 'ellipsize' },
      4: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.13 },
      5: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.12 },
      6: { ...PDF_TABLE_MONEY_COLUMN, cellWidth: tableW * 0.12, fontStyle: 'bold' },
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

  return lastTableY(doc, y) + 8;
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
    `${operating.length} transaction${operating.length === 1 ? '' : 's'} in period`
  );

  y = drawKpiGrid(doc, y, [
    { label: 'Income', value: pdfMoney(incomeTotal), accent: 'positive' },
    { label: 'Expenses', value: pdfMoney(expenseTotal), accent: 'negative' },
    {
      label: 'Transactions net',
      value: pdfMoney(operatingNet),
      accent: operatingNet >= 0 ? 'positive' : 'negative',
    },
  ]);

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
    ...baseAutoTableOptions(tableW),
    startY: y,
    head: [['Date', 'Type', 'Label', 'Category', 'Amount']],
    body: opRows.length > 0 ? opRows : [['No transactions in this period.', '', '', '', '']],
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

  return lastTableY(doc, y) + 8;
}

function appendReportDefinitions(doc: jsPDF, y: number): number {
  y = ensurePageSpace(doc, y, 52);
  y = drawSectionEyebrow(doc, y, 'Definitions', 'How ledger and breakdown figures are calculated');
  return drawBulletNotes(doc, y, [
    'All amounts are Philippine pesos (PHP) without a currency prefix in tables.',
    'Booking rate = down payment + guest balance (booking rate − down payment).',
    'Additional fees = pet fee + parking margin + additional guest fee (security deposit pass-through excluded).',
    'Host net = booking rate + additional fees + SD settlement profits − SD settlement expenses − parking owner rate (SD settlement lines apply only when COMPLETED). SD collection and SD refund payout are never counted.',
    'Total net = sum of completed host net plus transactions net for this period. In-progress host net (EST) uses the same operating formula without SD pass-through.',
  ]);
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

async function buildFinanceReportPdf(
  payload: FinancePdfPayload,
  type: FinanceExportType = 'combined'
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerPdfFonts(doc);
  paintPageBackground(doc);

  const preset = financePresetLabel(payload.query);
  const range = financePeriodRangeLabel(payload.query.from, payload.query.to);

  let y = drawReportHeader(doc, {
    moduleLabel: 'Finance',
    reportTypeLabel: REPORT_TYPE_LABEL[type],
    periodLine: preset ? `${preset} · ${range}` : range,
    metaLines: buildFinanceHeaderMeta(payload.query),
  });

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

  addPageFooter(doc, 'Finance');
  return doc;
}

export async function downloadFinanceReportPdf(
  payload: FinancePdfPayload,
  type: FinanceExportType = 'combined'
): Promise<void> {
  const doc = await buildFinanceReportPdf(payload, type);
  const from = payload.query.from ?? 'all';
  const to = payload.query.to ?? 'all';
  const prefix = PDF_FILENAME_PREFIX[type];
  doc.save(`${prefix}_${from}_${to}.pdf`);
}
