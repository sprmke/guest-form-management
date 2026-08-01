import { addDays, differenceInCalendarDays, getDay, format } from 'date-fns';

/** Fri–Sun use the weekend nightly rate (property default). */
export function isWeekendRateDay(date: Date): boolean {
  const day = getDay(date);
  return day === 0 || day === 5 || day === 6;
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Groups a (possibly non-contiguous) set of dates into `[startDate, endDate)` night
 * ranges, checkout-exclusive like bookings. Used to submit `blockRange` per contiguous run.
 */
export function contiguousDateRanges(dates: Date[]): { startDate: string; endDate: string }[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const ranges: { startDate: string; endDate: string }[] = [];

  let runStart = sorted[0]!;
  let runEnd = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    if (differenceInCalendarDays(current, runEnd) === 1) {
      runEnd = current;
      continue;
    }
    ranges.push({ startDate: dateKey(runStart), endDate: dateKey(addDays(runEnd, 1)) });
    runStart = current;
    runEnd = current;
  }
  ranges.push({ startDate: dateKey(runStart), endDate: dateKey(addDays(runEnd, 1)) });
  return ranges;
}
