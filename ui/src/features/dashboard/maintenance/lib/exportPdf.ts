import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { detectPreset } from '@/features/dashboard/maintenance/lib/maintenancePeriod';
import type {
  MaintenanceExportType,
  MaintenanceItem,
  MaintenanceQuery,
  MaintenanceSummary,
} from '@/features/dashboard/maintenance/lib/types';

import { registerPdfFonts } from '@/lib/pdf/pdfFonts';
import { pdfIsoDate } from '@/lib/pdf/pdfFormatters';
import {
  addPageFooter,
  baseAutoTableOptions,
  contentWidth,
  drawKpiGrid,
  drawReportHeader,
  drawSectionEyebrow,
  ensurePageSpace,
  lastTableY,
  paintPageBackground,
  startNewPage,
} from '@/lib/pdf/pdfReportLayout';
import { PDF_COLORS } from '@/lib/pdf/pdfTheme';

const REPORT_TYPE_LABEL: Record<MaintenanceExportType, string> = {
  combined: 'Full maintenance report',
  overview: 'Overview summary',
  reminders: 'Reminders list',
};

const PDF_FILENAME_PREFIX: Record<MaintenanceExportType, string> = {
  combined: 'kame-maintenance-report',
  overview: 'kame-maintenance-overview',
  reminders: 'kame-maintenance-reminders',
};

function formatIsoDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function periodRangeLabel(from: string | null, to: string | null): string {
  if (!from && !to) return 'All dates';
  if (from && to) return `${formatIsoDate(from)} – ${formatIsoDate(to)}`;
  if (from) return `From ${formatIsoDate(from)}`;
  return `Through ${formatIsoDate(to)}`;
}

function presetLabel(query: MaintenanceQuery): string | null {
  const preset = detectPreset(query.from, query.to);
  if (preset === 'custom') return null;
  const labels = {
    this_month: 'This month',
    last_month: 'Last month',
    ytd: 'Year to date',
    all: 'All time',
  } as const;
  return labels[preset];
}

function itemStatusLabel(item: MaintenanceItem): string {
  if (item.completed_at) return 'Done';
  if (item.telegram_reminder_enabled) return 'Pending';
  return '—';
}

type MaintenancePdfPayload = {
  query: MaintenanceQuery;
  summary: MaintenanceSummary;
  items: MaintenanceItem[];
};

function buildMaintenanceHeaderMeta(query: MaintenanceQuery): string[] {
  if (!query.q.trim()) return [];
  return [`Search: "${query.q.trim()}"`];
}

function appendOverviewSection(doc: jsPDF, y: number, summary: MaintenanceSummary): number {
  y = drawSectionEyebrow(doc, y, 'Summary', 'Totals for the selected period');
  y = drawKpiGrid(
    doc,
    y,
    [
      { label: 'Total', value: String(summary.total) },
      { label: 'Telegram enabled', value: String(summary.telegramEnabled) },
      { label: 'Completed', value: String(summary.completed) },
      { label: 'Pending', value: String(summary.pending) },
    ],
    4
  );

  if (summary.byCategory.length > 0) {
    y = ensurePageSpace(doc, y, 60);
    y = drawSectionEyebrow(doc, y, 'By category');
    const tableW = contentWidth(doc);
    autoTable(doc, {
      ...baseAutoTableOptions(tableW),
      startY: y,
      head: [['Category', 'Count']],
      body: summary.byCategory.map((row) => [row.category, String(row.count)]),
      columnStyles: {
        0: { cellWidth: tableW * 0.72 },
        1: { cellWidth: tableW * 0.28, halign: 'right' },
      },
    });
    y = lastTableY(doc, y) + 7;
  }

  return y;
}

function appendRemindersSection(doc: jsPDF, y: number, items: MaintenanceItem[]): number {
  y = drawSectionEyebrow(
    doc,
    y,
    'Reminders',
    `${items.length} reminder${items.length === 1 ? '' : 's'} in period`
  );

  const tableW = contentWidth(doc);
  const rows = items.map((item) => [
    pdfIsoDate(item.scheduled_on),
    item.label,
    item.category ?? '—',
    itemStatusLabel(item),
    item.notes?.trim() || '—',
  ]);

  autoTable(doc, {
    ...baseAutoTableOptions(tableW),
    startY: y,
    head: [['Date', 'Label', 'Category', 'Status', 'Notes']],
    body: rows.length > 0 ? rows : [['No reminders match the selected filters.', '', '', '', '']],
    columnStyles: {
      0: { cellWidth: tableW * 0.14, halign: 'left' },
      1: { cellWidth: tableW * 0.28 },
      2: { cellWidth: tableW * 0.18 },
      3: { cellWidth: tableW * 0.12, halign: 'center' },
      4: { cellWidth: tableW * 0.28 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 3) return;
      const status = String(data.cell.raw);
      if (status === 'Done') {
        data.cell.styles.textColor = PDF_COLORS.success;
        data.cell.styles.fontStyle = 'bold';
      } else if (status === 'Pending') {
        data.cell.styles.textColor = PDF_COLORS.warning;
      }
    },
  });

  return lastTableY(doc, y) + 8;
}

async function buildMaintenanceReportPdf(
  payload: MaintenancePdfPayload,
  type: MaintenanceExportType = 'combined'
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerPdfFonts(doc);
  paintPageBackground(doc);

  const preset = presetLabel(payload.query);
  const range = periodRangeLabel(payload.query.from, payload.query.to);

  let y = drawReportHeader(doc, {
    moduleLabel: 'Maintenance',
    reportTypeLabel: REPORT_TYPE_LABEL[type],
    periodLine: preset ? `${preset} · ${range}` : range,
    metaLines: buildMaintenanceHeaderMeta(payload.query),
  });

  if (type === 'overview' || type === 'combined') {
    y = appendOverviewSection(doc, y, payload.summary);
  }

  if (type === 'reminders' || type === 'combined') {
    if (type === 'combined') {
      y = startNewPage(doc);
    } else {
      y = ensurePageSpace(doc, y, 70);
    }
    y = appendRemindersSection(doc, y, payload.items);
  }

  addPageFooter(doc, 'Maintenance');
  return doc;
}

export async function downloadMaintenanceReportPdf(
  payload: MaintenancePdfPayload,
  type: MaintenanceExportType = 'combined'
): Promise<void> {
  const doc = await buildMaintenanceReportPdf(payload, type);
  const from = payload.query.from ?? 'all';
  const to = payload.query.to ?? 'all';
  const prefix = PDF_FILENAME_PREFIX[type];
  doc.save(`${prefix}_${from}_${to}.pdf`);
}
