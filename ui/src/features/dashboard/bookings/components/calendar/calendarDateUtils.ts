import {
  differenceInCalendarMonths,
  eachDayOfInterval,
  format,
  getDay,
  isSameDay,
  parse,
  startOfMonth,
  subDays,
} from 'date-fns';

import type { DatePreset } from '@/lib/date/navigation';

/** Parse MM-DD-YYYY or YYYY-MM-DD stay dates from the DB. */
export function parseOccupancyDate(value: string | null | undefined): Date | null {
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
/** Map each row to a single calendar day (transactions, maintenance reminders). */
export function buildItemsByDate<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const parsed = parseOccupancyDate(getDate(row));
    if (!parsed) continue;
    const key = format(parsed, 'yyyy-MM-dd');
    const existing = map.get(key);
    if (existing) existing.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export function buildOccupancyByDay<T>(
  rows: T[],
  getCheckIn: (row: T) => string | null | undefined,
  getCheckOut: (row: T) => string | null | undefined
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

export type CalendarWeekRow = {
  weekIndex: number;
  /** Seven slots; null = padding cell outside the visible month/range. */
  days: (Date | null)[];
};

export type OccupancySegment<T> = {
  item: T;
  weekIndex: number;
  startCol: number;
  endCol: number;
  lane: number;
  /** Guest/price label at the start of each week fragment (continuations stay readable). */
  showLabel: boolean;
  spanStart: boolean;
  spanEnd: boolean;
};

export type CalendarOccupancySpanPosition = 'single' | 'start' | 'middle' | 'end';

export function calendarOccupancySpanPosition(segment: {
  spanStart: boolean;
  spanEnd: boolean;
}): CalendarOccupancySpanPosition {
  if (segment.spanStart && segment.spanEnd) return 'single';
  if (segment.spanStart) return 'start';
  if (segment.spanEnd) return 'end';
  return 'middle';
}

/** Week rows for a month/range grid (Sunday-first, 7 columns). */
export function buildCalendarWeekRows(days: Date[], paddingStart: number): CalendarWeekRow[] {
  const slots: (Date | null)[] = [...Array.from({ length: paddingStart }, () => null), ...days];
  while (slots.length % 7 !== 0) {
    slots.push(null);
  }

  const weeks: CalendarWeekRow[] = [];
  for (let index = 0; index < slots.length; index += 7) {
    weeks.push({
      weekIndex: weeks.length,
      days: slots.slice(index, index + 7),
    });
  }
  return weeks;
}

function occupiedNightRange<T>(
  row: T,
  getCheckIn: (row: T) => string | null | undefined,
  getCheckOut: (row: T) => string | null | undefined
): { start: Date; end: Date } | null {
  const start = parseOccupancyDate(getCheckIn(row));
  const end = parseOccupancyDate(getCheckOut(row));
  if (!start || !end || start >= end) return null;
  return { start, end: subDays(end, 1) };
}

function assignOccupancyLanes<T>(
  segments: Omit<OccupancySegment<T>, 'lane'>[]
): OccupancySegment<T>[] {
  const sorted = [...segments].sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
  const laneEnds: number[] = [];

  return sorted.map((segment) => {
    let lane = laneEnds.findIndex((endCol) => endCol < segment.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(segment.endCol);
    } else {
      laneEnds[lane] = segment.endCol;
    }
    return { ...segment, lane };
  });
}

/** Multi-night stays become one bar segment per calendar week row (not one pill per cell). */
export function buildOccupancySegmentsForWeeks<T>(
  rows: T[],
  weeks: CalendarWeekRow[],
  getCheckIn: (row: T) => string | null | undefined,
  getCheckOut: (row: T) => string | null | undefined
): Map<number, OccupancySegment<T>[]> {
  const segmentsByWeek = new Map<number, OccupancySegment<T>[]>();

  for (const week of weeks) {
    const raw: Omit<OccupancySegment<T>, 'lane'>[] = [];

    for (const row of rows) {
      const range = occupiedNightRange(row, getCheckIn, getCheckOut);
      if (!range) continue;

      let startCol: number | null = null;
      let endCol: number | null = null;

      for (let col = 0; col < 7; col++) {
        const day = week.days[col];
        if (!day) continue;
        if (day < range.start || day > range.end) continue;
        if (startCol === null) startCol = col;
        endCol = col;
      }

      if (startCol === null || endCol === null) continue;

      const spanStart = isSameDay(week.days[startCol]!, range.start);
      const spanEnd = isSameDay(week.days[endCol]!, range.end);

      raw.push({
        item: row,
        weekIndex: week.weekIndex,
        startCol,
        endCol,
        // Label each week fragment so multi-week stays stay readable (no empty bars).
        showLabel: true,
        spanStart,
        spanEnd,
      });
    }

    segmentsByWeek.set(week.weekIndex, assignOccupancyLanes(raw));
  }

  return segmentsByWeek;
}

export type CalendarVisibleRange = {
  from: Date;
  to: Date;
};

/** Leading empty cells before the first day of a month/range grid. */
export function calendarPaddingStart(date: Date, weekStartsOn: 0 | 1 = 0): number {
  const weekday = getDay(date);
  if (weekStartsOn === 1) return weekday === 0 ? 6 : weekday - 1;
  return weekday;
}

/** Week-aligned day list for a visible date range (dashboard filter). */
export function buildRangeCalendarDays(range: CalendarVisibleRange): {
  days: Date[];
  paddingStart: number;
} {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  return { days, paddingStart: calendarPaddingStart(range.from) };
}

/** Name/Price pills only fit single-month cells; year and multi-month views use dots or dense grids. */
export function calendarSupportsPillLabelToggle(
  datePreset: DatePreset,
  rangeFrom: Date | null,
  rangeTo: Date | null
): boolean {
  if (datePreset === 'year') return false;
  if (!rangeFrom || !rangeTo) return true;
  return differenceInCalendarMonths(startOfMonth(rangeTo), startOfMonth(rangeFrom)) === 0;
}
