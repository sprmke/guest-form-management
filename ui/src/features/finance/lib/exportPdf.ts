import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatBookingDate, formatMoney } from '@/features/admin/lib/formatters';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import type {
  FinanceBookingLedgerRow,
  FinanceLineItem,
  FinanceQuery,
  FinanceSummary,
} from '@/features/finance/lib/types';
import {
  financeBasisLabel,
  financePeriodRangeLabel,
  financePresetLabel,
} from '@/features/finance/lib/financeFilterLabels';

const BRAND = { r: 15, g: 118, b: 110 };
const INK = { r: 15, g: 23, b: 42 };
const MUTED = { r: 100, g: 116, b: 139 };
const SLATE_50 = { r: 248, g: 250, b: 252 };
const SLATE_200 = { r: 226, g: 232, b: 240 };
const EMERALD = { r: 4, g: 120, b: 87 };
const RED = { r: 220, g: 38, b: 38 };

function peso(n: number | string | null | undefined): string {
  return formatMoney(n).replace(/\u00A0/g, ' ');
}

function accentColor(accent: 'positive' | 'negative' | 'neutral') {
  if (accent === 'positive') return EMERALD;
  if (accent === 'negative') return RED;
  return INK;
}

function addPageFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(SLATE_200.r, SLATE_200.g, SLATE_200.b);
    doc.line(14, doc.internal.pageSize.getHeight() - 12, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(
      `Kame Homes Finance · Page ${i} of ${pages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'center' },
    );
  }
}

function drawReportHeader(doc: jsPDF, query: FinanceQuery) {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, w, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Kame Homes', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Finance Report', 14, 22);

  const generated = format(new Date(), "MMM d, yyyy 'at' h:mm a");
  doc.setFontSize(8);
  doc.text(generated, w - 14, 14, { align: 'right' });

  const preset = financePresetLabel(query);
  const range = financePeriodRangeLabel(query.from, query.to);
  const basis = financeBasisLabel(query.basis);

  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(preset ? `${preset} · ${range}` : range, 14, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const filterParts = [`Grouped by ${basis.toLowerCase()}`];
  if (query.completedOnly && query.basis !== 'completed') {
    filterParts.push('Completed stays only');
  }
  if (query.includeCancelled) filterParts.push('Includes cancelled');
  if (query.q.trim()) filterParts.push(`Search: "${query.q.trim()}"`);
  doc.text(filterParts.join(' · '), 14, 50);
}

type KpiItem = {
  label: string;
  value: string;
  accent?: 'positive' | 'negative' | 'neutral';
};

function drawHeroNet(doc: jsPDF, y: number, grandNet: number): number {
  const w = doc.internal.pageSize.getWidth();
  const boxW = w - 28;
  const positive = grandNet >= 0;
  const color = positive ? EMERALD : RED;

  doc.setDrawColor(SLATE_200.r, SLATE_200.g, SLATE_200.b);
  doc.setFillColor(SLATE_50.r, SLATE_50.g, SLATE_50.b);
  doc.roundedRect(14, y, boxW, 28, 3, 3, 'FD');

  doc.setFillColor(color.r, color.g, color.b);
  doc.roundedRect(14, y, 4, 28, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('GRAND NET PROFIT', 22, y + 10);

  doc.setFontSize(20);
  doc.setTextColor(color.r, color.g, color.b);
  doc.text(peso(grandNet), 22, y + 22);

  return y + 36;
}

function drawKpiGrid(doc: jsPDF, y: number, items: KpiItem[], cols = 4): number {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - 28) / cols;
  const rowH = 24;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * colW;
    const itemY = y + row * (rowH + 4);

    doc.setDrawColor(SLATE_200.r, SLATE_200.g, SLATE_200.b);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, itemY, colW - 4, rowH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(item.label.toUpperCase(), x + 4, itemY + 8);

    const c = accentColor(item.accent ?? 'neutral');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.r, c.g, c.b);
    doc.text(item.value, x + 4, itemY + 18);
  });

  const rows = Math.ceil(items.length / cols);
  return y + rows * (rowH + 4) + 6;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string, subtitle?: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(title, 14, y);

  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.8);
  doc.line(14, y + 2, 52, y + 2);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(subtitle, 14, y + 8);
    return y + 14;
  }

  return y + 10;
}

export type FinancePdfPayload = {
  query: FinanceQuery;
  summary: FinanceSummary;
  stays: FinanceBookingLedgerRow[];
  operating: FinanceLineItem[];
};

export function buildFinanceReportPdf(payload: FinancePdfPayload): jsPDF {
  const { query, summary, stays, operating } = payload;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  drawReportHeader(doc, query);

  let y = 58;
  const { stays: s, operating: o, grandNet } = summary;

  y = drawHeroNet(doc, y, grandNet);

  y = drawSectionTitle(doc, y, 'Summary', 'Key metrics for the selected period');
  y = drawKpiGrid(doc, y, [
    {
      label: 'Completed stays net',
      value: peso(s.hostNetCompleted),
      accent: s.hostNetCompleted >= 0 ? 'positive' : 'negative',
    },
    { label: 'Guest collected', value: peso(s.guestCollected) },
    {
      label: 'Operating net',
      value: peso(o.net),
      accent: o.net >= 0 ? 'positive' : 'negative',
    },
    { label: 'Outstanding balance', value: peso(s.outstandingGuestBalance) },
    { label: 'Stays in period', value: String(s.count) },
    { label: 'Completed stays', value: String(s.completedCount) },
    { label: 'Stay revenue', value: peso(s.stayRevenue) },
    { label: 'Parking margin', value: peso(s.parkingMargin) },
  ]);

  y = drawSectionTitle(
    doc,
    y,
    'Stays ledger',
    `${stays.length} stay${stays.length === 1 ? '' : 's'} · projected net shown for in-progress bookings`,
  );
  y += 2;

  const stayRows = stays.map((row) => {
    const fin = row.financials;
    const net = fin.isCompleted ? fin.hostNet : fin.projectedNet;
    const netLabel = fin.isCompleted ? 'Realized' : 'Projected';
    return [
      row.guest_facebook_name || row.primary_guest_name || '—',
      formatBookingDate(row.check_in_date),
      formatBookingDate(row.check_out_date),
      statusLabel(row.status),
      peso(fin.totalGuestBalance),
      peso(fin.guestCollected),
      peso(fin.parkingMargin ?? 0),
      `${peso(net ?? 0)} (${netLabel})`,
    ];
  });

  const completedNetTotal = stays.reduce((acc, row) => {
    if (!row.financials.isCompleted) return acc;
    return acc + (row.financials.hostNet ?? 0);
  }, 0);

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Guest',
        'Check-in',
        'Check-out',
        'Status',
        'Due',
        'Collected',
        'Parking',
        'Net',
      ],
    ],
    body:
      stayRows.length > 0
        ? stayRows
        : [['No stays match the selected filters.', '', '', '', '', '', '', '']],
    foot:
      stayRows.length > 0
        ? [
            [
              'Totals (completed net)',
              '',
              '',
              '',
              '',
              peso(s.guestCollected),
              peso(s.parkingMargin),
              peso(completedNetTotal),
            ],
          ]
        : undefined,
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [INK.r, INK.g, INK.b],
      lineColor: [SLATE_200.r, SLATE_200.g, SLATE_200.b],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [SLATE_50.r, SLATE_50.g, SLATE_50.b],
      textColor: [INK.r, INK.g, INK.b],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [SLATE_50.r, SLATE_50.g, SLATE_50.b] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number | undefined) ?? y + 40;
  y += 10;

  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }

  const incomeTotal = operating
    .filter((i) => i.kind === 'income')
    .reduce((a, i) => a + i.amount, 0);
  const expenseTotal = operating
    .filter((i) => i.kind === 'expense')
    .reduce((a, i) => a + i.amount, 0);
  const operatingNet = incomeTotal - expenseTotal;

  y = drawSectionTitle(
    doc,
    y,
    'Operating income & expenses',
    `${operating.length} line${operating.length === 1 ? '' : 's'} in period`,
  );

  y = drawKpiGrid(
    doc,
    y,
    [
      { label: 'Income', value: peso(incomeTotal), accent: 'positive' },
      { label: 'Expenses', value: peso(expenseTotal), accent: 'negative' },
      {
        label: 'Operating net',
        value: peso(operatingNet),
        accent: operatingNet >= 0 ? 'positive' : 'negative',
      },
    ],
    3,
  );

  const opRows = operating.map((item) => [
    item.occurred_on,
    item.kind === 'income' ? 'Income' : 'Expense',
    item.label,
    item.category ?? '—',
    `${item.kind === 'income' ? '+' : '−'}${peso(item.amount)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Type', 'Label', 'Category', 'Amount']],
    body:
      opRows.length > 0
        ? opRows
        : [['No operating lines in this period.', '', '', '', '']],
    foot:
      opRows.length > 0
        ? [
            [
              'Totals',
              '',
              '',
              '',
              `${operatingNet >= 0 ? '+' : '−'}${peso(Math.abs(operatingNet))}`,
            ],
          ]
        : undefined,
    margin: { left: 14, right: 14 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [INK.r, INK.g, INK.b],
      lineColor: [SLATE_200.r, SLATE_200.g, SLATE_200.b],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [SLATE_50.r, SLATE_50.g, SLATE_50.b],
      textColor: [INK.r, INK.g, INK.b],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [SLATE_50.r, SLATE_50.g, SLATE_50.b] },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const footY =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (((doc as any).lastAutoTable?.finalY as number) ?? y) + 8;
  const note = doc.splitTextToSize(
    'Grand net = completed stay profit/loss plus operating net for the selected period. Projected net on in-progress stays is informational only.',
    pageW - 28,
  );
  if (footY < doc.internal.pageSize.getHeight() - 16) {
    doc.text(note, 14, footY);
  }

  addPageFooter(doc);
  return doc;
}

export function downloadFinanceReportPdf(payload: FinancePdfPayload): void {
  const doc = buildFinanceReportPdf(payload);
  const from = payload.query.from ?? 'all';
  const to = payload.query.to ?? 'all';
  doc.save(`kame-finance-report_${from}_${to}.pdf`);
}
