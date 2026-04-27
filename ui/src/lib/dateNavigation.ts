import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  format,
  isSameMonth,
  isSameYear,
  isThisWeek,
  isThisMonth,
  isThisYear,
} from 'date-fns';

export type DatePreset = 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

/** Props interface that any date navigation consumer must provide. */
export interface DateNavigationState {
  dateRange: DateRange;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  setDateRange: (range: DateRange) => void;
  navigatePeriod: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
}

export function getDateRangeFromPreset(
  preset: DatePreset,
  referenceDate: Date,
): DateRange {
  switch (preset) {
    case 'week':
      // Sunday-first week (Sun → Sat) to match the calendar + range picker.
      return {
        from: startOfWeek(referenceDate, { weekStartsOn: 0 }),
        to: endOfWeek(referenceDate, { weekStartsOn: 0 }),
      };
    case 'month':
      return {
        from: startOfMonth(referenceDate),
        to: endOfMonth(referenceDate),
      };
    case 'year':
      return {
        from: startOfYear(referenceDate),
        to: endOfYear(referenceDate),
      };
    case 'custom':
    default:
      return {
        from: startOfMonth(referenceDate),
        to: endOfMonth(referenceDate),
      };
  }
}

export function navigateReferenceDate(
  referenceDate: Date,
  preset: DatePreset,
  direction: 'prev' | 'next',
): Date {
  switch (preset) {
    case 'week':
      return direction === 'next'
        ? addWeeks(referenceDate, 1)
        : subWeeks(referenceDate, 1);
    case 'month':
      return direction === 'next'
        ? addMonths(referenceDate, 1)
        : subMonths(referenceDate, 1);
    case 'year':
      return direction === 'next'
        ? addYears(referenceDate, 1)
        : subYears(referenceDate, 1);
    case 'custom':
    default:
      return referenceDate;
  }
}

/**
 * Format the date range display for the selected preset.
 * Adapted verbatim from property-management-app's `formatDateRangeDisplay`
 * so behavior matches the calendar dashboard exactly.
 */
export function formatDateRangeDisplay(
  from: Date,
  to: Date,
  preset: DatePreset,
): string {
  switch (preset) {
    case 'week': {
      if (isSameMonth(from, to)) {
        return `${format(from, 'MMM d')} - ${format(to, 'd, yyyy')}`;
      }
      if (isSameYear(from, to)) {
        return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
      }
      return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`;
    }
    case 'month': {
      return format(from, 'MMMM yyyy');
    }
    case 'year': {
      return format(from, 'yyyy');
    }
    case 'custom':
    default: {
      if (isSameYear(from, to)) {
        if (isSameMonth(from, to)) {
          return `${format(from, 'MMM d')} - ${format(to, 'd, yyyy')}`;
        }
        return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
      }
      return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`;
    }
  }
}

export function isCurrentPeriod(from: Date, preset: DatePreset): boolean {
  switch (preset) {
    case 'week':
      return isThisWeek(from, { weekStartsOn: 0 });
    case 'month':
      return isThisMonth(from);
    case 'year':
      return isThisYear(from);
    default:
      return false;
  }
}

/** Format a Date as YYYY-MM-DD (used for URL params + edge function query). */
export function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Parse a YYYY-MM-DD string into a Date at local midnight. Returns null on bad input. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? null : date;
}
