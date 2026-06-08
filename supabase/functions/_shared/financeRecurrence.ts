/**
 * Recurrence helpers for finance_line_items — materialized occurrence dates.
 */

export type RecurrenceInterval =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type RecurrenceEditScope = 'this' | 'this_and_future' | 'all';

const INTERVALS: ReadonlySet<string> = new Set([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);

export function isRecurrenceInterval(v: unknown): v is RecurrenceInterval {
  return typeof v === 'string' && INTERVALS.has(v);
}

export function isRecurrenceEditScope(v: unknown): v is RecurrenceEditScope {
  return v === 'this' || v === 'this_and_future' || v === 'all';
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error('invalid_date');
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addRecurrenceInterval(
  iso: string,
  interval: RecurrenceInterval,
): string {
  const { y, m, d } = parseIso(iso);
  switch (interval) {
    case 'daily': {
      const t = Date.UTC(y, m - 1, d + 1);
      const nd = new Date(t);
      return formatIso(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
    }
    case 'weekly': {
      const t = Date.UTC(y, m - 1, d + 7);
      const nd = new Date(t);
      return formatIso(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
    }
    case 'monthly': {
      let nm = m + 1;
      let ny = y;
      if (nm > 12) {
        nm = 1;
        ny += 1;
      }
      const nd = Math.min(d, daysInMonth(ny, nm));
      return formatIso(ny, nm, nd);
    }
    case 'quarterly': {
      let nm = m + 3;
      let ny = y;
      while (nm > 12) {
        nm -= 12;
        ny += 1;
      }
      const nd = Math.min(d, daysInMonth(ny, nm));
      return formatIso(ny, nm, nd);
    }
    case 'yearly':
      return formatIso(y + 1, m, Math.min(d, daysInMonth(y + 1, m)));
  }
}

export function defaultRecurrenceUntil(
  start: string,
  interval: RecurrenceInterval,
): string {
  const { y, m, d } = parseIso(start);
  switch (interval) {
    case 'daily':
      return formatIso(y, m, Math.min(d + 90, daysInMonth(y, m))); // approx 3 months via loop below
    case 'weekly': {
      const t = Date.UTC(y, m - 1, d + 52 * 7);
      const nd = new Date(t);
      return formatIso(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
    }
    case 'monthly':
    case 'quarterly': {
      let nm = m + (interval === 'monthly' ? 24 : 24);
      let ny = y;
      while (nm > 12) {
        nm -= 12;
        ny += 1;
      }
      return formatIso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
    }
    case 'yearly':
      return formatIso(y + 5, m, Math.min(d, daysInMonth(y + 5, m)));
  }
}

/** Default end date for daily — 90 occurrences from start. */
export function defaultRecurrenceUntilForInterval(
  start: string,
  interval: RecurrenceInterval,
): string {
  if (interval === 'daily') {
    const dates = generateRecurrenceDates(start, interval, '2099-12-31', 90);
    return dates[dates.length - 1] ?? start;
  }
  return defaultRecurrenceUntil(start, interval);
}

export function generateRecurrenceDates(
  start: string,
  interval: RecurrenceInterval,
  until: string,
  maxCount = 500,
): string[] {
  if (until < start) return [start];
  const dates: string[] = [];
  let cur = start;
  while (cur <= until && dates.length < maxCount) {
    dates.push(cur);
    const next = addRecurrenceInterval(cur, interval);
    if (next <= cur) break;
    cur = next;
  }
  return dates;
}
