import { statusTone, type StatusTone } from '@/features/dashboard/bookings/lib/bookingStatus';

import type { PdfRgb } from '@/lib/pdf/pdfTheme';

/** Badge text colors aligned with `StatusBadge` / `STATUS_TONE_STYLES` (print on white). */
const STATUS_TONE_PDF_TEXT: Record<StatusTone, PdfRgb> = {
  red: [159, 18, 57],
  yellow: [113, 63, 18],
  green: [19, 78, 74],
  amber: [120, 53, 15],
  orange: [154, 52, 18],
  blue: [12, 74, 110],
  purple: [91, 33, 182],
  neutral: [51, 65, 85],
};

export function pdfStatusTextColor(status: string): PdfRgb {
  return STATUS_TONE_PDF_TEXT[statusTone(status)];
}

/** Maintenance reminder row status labels from exportPdf. */
export function pdfMaintenanceStatusColor(label: string): PdfRgb {
  if (label === 'Done') return STATUS_TONE_PDF_TEXT.green;
  if (label === 'Pending') return STATUS_TONE_PDF_TEXT.amber;
  return STATUS_TONE_PDF_TEXT.neutral;
}
