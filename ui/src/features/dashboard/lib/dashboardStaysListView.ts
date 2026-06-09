import type { DatePreset } from '@/lib/dateNavigation';

export const STAYS_DAY_GRID_MAX_DAYS = 31;

export type DashboardStaysListView = {
  showEmptyDays: boolean;
  showPreviousDates: boolean;
};

function daysInclusive(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

/** Default list filters when the period or preset changes. */
export function defaultStaysListView(
  manilaDate: string,
  rangeFrom: string,
  rangeTo: string,
  datePreset: DatePreset,
): DashboardStaysListView {
  const todayInRange = manilaDate >= rangeFrom && manilaDate <= rangeTo;
  const hidePreviousByDefault =
    todayInRange && (datePreset === 'week' || datePreset === 'month');

  return {
    showEmptyDays: true,
    showPreviousDates: !hidePreviousByDefault,
  };
}

export function effectiveRangeStart(
  rangeFrom: string,
  manilaDate: string,
  showPreviousDates: boolean,
): string {
  if (showPreviousDates) return rangeFrom;
  return rangeFrom > manilaDate ? rangeFrom : manilaDate;
}

export function staysDayGridAvailable(
  rangeFrom: string,
  rangeTo: string,
  manilaDate: string,
  showPreviousDates: boolean,
): boolean {
  const start = effectiveRangeStart(rangeFrom, manilaDate, showPreviousDates);
  return (
    start <= rangeTo &&
    daysInclusive(start, rangeTo) <= STAYS_DAY_GRID_MAX_DAYS
  );
}
