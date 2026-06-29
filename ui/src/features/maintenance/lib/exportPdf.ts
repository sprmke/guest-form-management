import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  MaintenanceExportType,
  MaintenanceItem,
  MaintenanceQuery,
  MaintenanceSummary,
} from "@/features/maintenance/lib/types";
import { detectPreset } from "@/features/maintenance/lib/maintenancePeriod";
import { pdfIsoDate } from "@/features/finance/lib/pdfFormatters";
import { registerPdfFonts, setPdfFont } from "@/features/finance/lib/pdfFonts";
import {
  PDF_COLORS,
  PDF_FONT,
  PDF_LAYOUT,
  PDF_TYPE,
  drawCard,
  setPdfDraw,
  setPdfFill,
  setPdfText,
} from "@/features/finance/lib/pdfTheme";

const REPORT_TYPE_LABEL: Record<MaintenanceExportType, string> = {
  combined: "Full maintenance report",
  overview: "Overview summary",
  reminders: "Reminders list",
};

const PDF_FILENAME_PREFIX: Record<MaintenanceExportType, string> = {
  combined: "maintenance_full",
  overview: "maintenance_overview",
  reminders: "maintenance_reminders",
};

function formatIsoDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function periodRangeLabel(from: string | null, to: string | null): string {
  if (!from && !to) return "All dates";
  if (from && to) return `${formatIsoDate(from)} – ${formatIsoDate(to)}`;
  if (from) return `From ${formatIsoDate(from)}`;
  return `Through ${formatIsoDate(to)}`;
}

function presetLabel(query: MaintenanceQuery): string | null {
  const preset = detectPreset(query.from, query.to);
  if (preset === "custom") return null;
  const labels = {
    this_month: "This month",
    last_month: "Last month",
    ytd: "Year to date",
    all: "All time",
  } as const;
  return labels[preset];
}

function itemStatusLabel(item: MaintenanceItem): string {
  if (item.completed_at) return "Done";
  if (item.telegram_reminder_enabled) return "Pending";
  return "—";
}

type MaintenancePdfPayload = {
  query: MaintenanceQuery;
  summary: MaintenanceSummary;
  items: MaintenanceItem[];
};

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
  overflow: "linebreak" as const,
};

function paintPageBackground(doc: jsPDF): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  setPdfFill(doc, PDF_COLORS.pageBg);
  doc.rect(0, 0, w, h, "F");
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

function drawReportHeader(
  doc: jsPDF,
  query: MaintenanceQuery,
  exportType: MaintenanceExportType,
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
  doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2, 2, "F");
  setPdfText(doc, PDF_COLORS.primaryFg);
  setPdfFont(doc, "bold", 7.5);
  doc.text("KH", badgeX + badgeSize / 2, badgeY + 6.8, { align: "center" });

  const textX = badgeX + badgeSize + 4;
  setPdfText(doc, PDF_COLORS.foreground);
  setPdfFont(doc, "bold", PDF_TYPE.title);
  doc.text("Kame Homes", textX, cardY + 10);

  setPdfFont(doc, "normal", PDF_TYPE.caption);
  setPdfText(doc, PDF_COLORS.muted);
  doc.text(REPORT_TYPE_LABEL[exportType], textX, cardY + 16);

  const generated = format(new Date(), "MMM d, yyyy 'at' h:mm a");
  doc.text(generated, m + cardW - 4, cardY + 10, { align: "right" });
  doc.text("Maintenance", m + cardW - 4, cardY + 16, { align: "right" });

  const preset = presetLabel(query);
  const range = periodRangeLabel(query.from, query.to);

  let y = cardY + cardH + PDF_LAYOUT.afterHeaderCard;

  setPdfFont(doc, "bold", PDF_TYPE.section);
  setPdfText(doc, PDF_COLORS.foreground);
  doc.text(preset ? `${preset} · ${range}` : range, m, y);

  if (query.q.trim()) {
    y += PDF_LAYOUT.metaLine;
    setPdfFont(doc, "normal", PDF_TYPE.caption);
    setPdfText(doc, PDF_COLORS.muted);
    doc.text(`Search: "${query.q.trim()}"`, m, y);
  }

  return y + PDF_LAYOUT.beforeBlock;
}

type KpiItem = {
  label: string;
  value: string;
};

function drawSectionEyebrow(doc: jsPDF, y: number, title: string): number {
  const m = PDF_LAYOUT.margin;
  setPdfFont(doc, "bold", PDF_TYPE.overline);
  setPdfText(doc, PDF_COLORS.primary);
  doc.text(title.toUpperCase(), m, y);
  return y + PDF_LAYOUT.afterSectionTitle;
}

function drawKpiGrid(doc: jsPDF, y: number, items: KpiItem[], cols = 4): number {
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

    setPdfFont(doc, "bold", PDF_TYPE.overline);
    setPdfText(doc, PDF_COLORS.muted);
    const labelLines = doc.splitTextToSize(item.label.toUpperCase(), cardW - 5);
    doc.text(labelLines.slice(0, 2), x + 3, itemY + 6);

    setPdfFont(doc, "bold", PDF_TYPE.data);
    setPdfText(doc, PDF_COLORS.foreground);
    doc.text(item.value, x + 3, itemY + 15);
  });

  const rows = Math.ceil(items.length / cols);
  return y + rows * (rowH + gap) + PDF_LAYOUT.sectionGap;
}

function appendOverviewSection(
  doc: jsPDF,
  y: number,
  summary: MaintenanceSummary,
): number {
  y = drawSectionEyebrow(doc, y, "Summary");
  y = drawKpiGrid(doc, y, [
    { label: "Total", value: String(summary.total) },
    { label: "Telegram enabled", value: String(summary.telegramEnabled) },
    { label: "Completed", value: String(summary.completed) },
    { label: "Pending", value: String(summary.pending) },
  ]);

  if (summary.byCategory.length > 0) {
    y = ensurePageSpace(doc, y, 60);
    y = drawSectionEyebrow(doc, y, "By category");
    const tableW = contentWidth(doc);
    autoTable(doc, {
      startY: y,
      tableWidth: tableW,
      margin: TABLE_MARGIN,
      head: [["Category", "Count"]],
      body: summary.byCategory.map((row) => [row.category, String(row.count)]),
      styles: TABLE_STYLES,
      headStyles: {
        fillColor: PDF_COLORS.primarySubtle,
        textColor: PDF_COLORS.primaryDark,
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
    });
    y = lastTableY(doc, y) + PDF_LAYOUT.sectionGap;
  }

  return y;
}

function appendRemindersSection(
  doc: jsPDF,
  y: number,
  items: MaintenanceItem[],
): number {
  y = drawSectionEyebrow(
    doc,
    y,
    `Reminders (${items.length})`,
  );

  const tableW = contentWidth(doc);
  const rows = items.map((item) => [
    pdfIsoDate(item.scheduled_on),
    item.label,
    item.category ?? "—",
    itemStatusLabel(item),
    item.notes?.trim() || "—",
  ]);

  autoTable(doc, {
    startY: y,
    tableWidth: tableW,
    margin: TABLE_MARGIN,
    head: [["Date", "Label", "Category", "Status", "Notes"]],
    body:
      rows.length > 0
        ? rows
        : [["No reminders match the selected filters.", "", "", "", ""]],
    styles: TABLE_STYLES,
    headStyles: {
      fillColor: PDF_COLORS.primarySubtle,
      textColor: PDF_COLORS.primaryDark,
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18 },
      4: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: PDF_COLORS.tableStripe },
  });

  return lastTableY(doc, y) + PDF_LAYOUT.sectionGap;
}

function addPageFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    setPdfDraw(doc, PDF_COLORS.border);
    doc.setLineWidth(0.1);
    doc.line(PDF_LAYOUT.margin, h - 12, w - PDF_LAYOUT.margin, h - 12);
    setPdfFont(doc, "normal", PDF_TYPE.caption);
    setPdfText(doc, PDF_COLORS.muted);
    doc.text(`Page ${i} of ${pageCount}`, w - PDF_LAYOUT.margin, h - 7, {
      align: "right",
    });
  }
}

async function buildMaintenanceReportPdf(
  payload: MaintenancePdfPayload,
  type: MaintenanceExportType = "combined",
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerPdfFonts(doc);
  paintPageBackground(doc);

  let y = drawReportHeader(doc, payload.query, type);

  if (type === "overview" || type === "combined") {
    y = appendOverviewSection(doc, y, payload.summary);
  }

  if (type === "reminders" || type === "combined") {
    if (type === "combined") {
      y = startNewPage(doc);
    } else {
      y = ensurePageSpace(doc, y, 70);
    }
    y = appendRemindersSection(doc, y, payload.items);
  }

  addPageFooter(doc);
  return doc;
}

export async function downloadMaintenanceReportPdf(
  payload: MaintenancePdfPayload,
  type: MaintenanceExportType = "combined",
): Promise<void> {
  const doc = await buildMaintenanceReportPdf(payload, type);
  const from = payload.query.from ?? "all";
  const to = payload.query.to ?? "all";
  const prefix = PDF_FILENAME_PREFIX[type];
  doc.save(`${prefix}_${from}_${to}.pdf`);
}
