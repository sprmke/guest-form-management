import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { formatTimeToAMPM } from '@/utils/dates';

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a NUMERIC money value (peso) with thousands separators.
 * NEW_FLOW_PLAN.md §6.1 Q2.4 — use `en-PH` grouping, `₱` prefix via Intl.
 * Pass `null` / `undefined` to render a muted em-dash sentinel ("—").
 */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return PESO.format(n);
}

/**
 * Dates in `guest_submissions.check_in_date` / `check_out_date` are stored as
 * `MM-DD-YYYY` text. Convert to a compact display (e.g. `Apr 20, 2026`).
 */
export function formatBookingDate(mmddyyyy: string | null | undefined): string {
  if (!mmddyyyy) return '—';
  const d = dayjs(mmddyyyy, 'MM-DD-YYYY');
  if (!d.isValid()) return mmddyyyy;
  return d.format('MMM D, YYYY');
}

/** ISO `YYYY-MM-DD` (e.g. finance_line_items.occurred_on) → `Apr 20, 2026`. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso.slice(0, 10));
  if (!d.isValid()) return iso;
  return d.format('MMM D, YYYY');
}

/** Short e.g. "Apr 20" — handy inside tight table cells when the year is obvious. */
export function formatBookingDateShort(mmddyyyy: string | null | undefined): string {
  if (!mmddyyyy) return '—';
  const d = dayjs(mmddyyyy, 'MM-DD-YYYY');
  if (!d.isValid()) return mmddyyyy;
  return d.format('MMM D');
}

/** 12-hour display for `guest_submissions.check_*_time` (DB stores 24h `HH:mm`). */
export function formatBookingTime(
  time: string | null | undefined,
  isCheckIn = false,
): string {
  if (!time?.trim()) return '';
  return formatTimeToAMPM(time, isCheckIn);
}

/** e.g. `Jun 1, 2026 at 2:00 PM` */
export function formatBookingDateTime(
  date: string | null | undefined,
  time: string | null | undefined,
  isCheckIn = false,
): string {
  const datePart = formatBookingDate(date);
  const timePart = formatBookingTime(time, isCheckIn);
  if (!timePart) return datePart;
  return `${datePart} at ${timePart}`;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  if (!d.isValid()) return '—';
  return d.fromNow();
}
