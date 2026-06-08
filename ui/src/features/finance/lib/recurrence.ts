export type RecurrenceInterval =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type RecurrenceEditScope = 'this' | 'this_and_future' | 'all';

export const RECURRENCE_INTERVAL_OPTIONS: {
  value: RecurrenceInterval;
  label: string;
}[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const RECURRENCE_SCOPE_OPTIONS: {
  value: RecurrenceEditScope;
  label: string;
  description: string;
}[] = [
  {
    value: 'this',
    label: 'This occurrence only',
    description: 'Update or delete only the selected date.',
  },
  {
    value: 'this_and_future',
    label: 'This and future',
    description: 'Apply from this date forward in the series.',
  },
  {
    value: 'all',
    label: 'All occurrences',
    description: 'Apply to every past and future entry in the series.',
  },
];

export function recurrenceIntervalLabel(
  interval: RecurrenceInterval | string | null | undefined,
): string | null {
  if (!interval || interval === 'none') return null;
  return RECURRENCE_INTERVAL_OPTIONS.find((o) => o.value === interval)?.label ?? interval;
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function addInterval(iso: string, interval: Exclude<RecurrenceInterval, 'none'>): string {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d);
  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly': {
      const day = date.getDate();
      date.setMonth(date.getMonth() + 1);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case 'quarterly': {
      const day = date.getDate();
      date.setMonth(date.getMonth() + 3);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Suggested end date when creating a new recurring series. */
export function defaultRecurrenceUntil(
  start: string,
  interval: Exclude<RecurrenceInterval, 'none'>,
): string {
  if (interval === 'daily') {
    let cur = start;
    for (let i = 0; i < 89; i++) cur = addInterval(cur, interval);
    return cur;
  }
  if (interval === 'weekly') {
    let cur = start;
    for (let i = 0; i < 51; i++) cur = addInterval(cur, interval);
    return cur;
  }
  const { y, m, d } = parseIso(start);
  if (interval === 'monthly' || interval === 'quarterly') {
    const months = 24;
    const date = new Date(y, m - 1 + months, Math.min(d, 28));
    return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  return formatIso(y + 5, m, Math.min(d, daysInMonth(y + 5, m)));
}
