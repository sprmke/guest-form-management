import { getDay, format } from 'date-fns';

/** Fri–Sun use the weekend nightly rate (property default). */
export function isWeekendRateDay(date: Date): boolean {
  const day = getDay(date);
  return day === 0 || day === 5 || day === 6;
}

export function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
