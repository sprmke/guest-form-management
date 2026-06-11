import {
  eachDayOfInterval,
  format,
  parse,
  subDays,
} from 'date-fns';

/** Parse MM-DD-YYYY or YYYY-MM-DD stay dates from the DB. */
export function parseOccupancyDate(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const d = parse(value, 'MM-dd-yyyy', new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Map each occupied calendar night to its rows.
 * Checkout morning is not an overnight — dates are [check-in, check-out).
 */
export function buildOccupancyByDay<T>(
  rows: T[],
  getCheckIn: (row: T) => string | null | undefined,
  getCheckOut: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const start = parseOccupancyDate(getCheckIn(row));
    const end = parseOccupancyDate(getCheckOut(row));
    if (!start || !end || start >= end) continue;
    const lastNight = subDays(end, 1);
    const days = eachDayOfInterval({ start, end: lastNight });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) existing.push(row);
      else map.set(key, [row]);
    }
  }
  return map;
}

export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
