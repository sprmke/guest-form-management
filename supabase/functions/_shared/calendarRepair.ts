import dayjs from 'https://esm.sh/dayjs@1.11.10';
import {
  buildGoogleCalendarDateTime,
  DEFAULT_CHECK_IN_TIME,
} from './utils.ts';
import {
  buildCalendarSummary,
  STATUS_CALENDAR_META,
  type BookingStatus,
} from './statusMachine.ts';

export type CalendarEventSnapshot = {
  summary: string;
  startDateTime: string;
};

export function plannedCalendarStart(
  booking: Record<string, unknown>,
): string {
  return buildGoogleCalendarDateTime(
    String(booking.check_in_date ?? ''),
    booking.check_in_time as string | undefined,
    DEFAULT_CHECK_IN_TIME,
  );
}

export function plannedCalendarSummary(
  status: BookingStatus,
  pax: number,
  nights: number,
  guestName: string,
  booking: Record<string, unknown>,
): string {
  return buildCalendarSummary(status, pax, nights, guestName, booking);
}

/** True when Google event title or start time does not match the DB row. */
export function calendarEventNeedsRepair(
  status: BookingStatus,
  plannedSummary: string,
  plannedStart: string,
  event: CalendarEventSnapshot,
): boolean {
  const label = STATUS_CALENDAR_META[status].label.toUpperCase();
  const summaryUpper = event.summary.toUpperCase();
  const statusOk = summaryUpper.includes(label);

  if (!plannedStart || !event.startDateTime) return !statusOk;

  const plannedHm = plannedStart.length >= 16 ? plannedStart.slice(11, 16) : '';
  const actualHm = dayjs(event.startDateTime.replace(/[+-]\d{2}:\d{2}$/, '')).format('HH:mm');
  const timeOk = plannedHm === actualHm;

  return !statusOk || !timeOk;
}

export function repairReasons(
  status: BookingStatus,
  plannedSummary: string,
  plannedStart: string,
  event: CalendarEventSnapshot,
): string[] {
  const reasons: string[] = [];
  const label = STATUS_CALENDAR_META[status].label.toUpperCase();
  if (!event.summary.toUpperCase().includes(label)) reasons.push('status');
  if (plannedStart && event.startDateTime) {
    const plannedHm = plannedStart.slice(11, 16);
    const actualHm = dayjs(event.startDateTime.replace(/[+-]\d{2}:\d{2}$/, '')).format('HH:mm');
    if (plannedHm !== actualHm) reasons.push('time');
  }
  return reasons;
}
