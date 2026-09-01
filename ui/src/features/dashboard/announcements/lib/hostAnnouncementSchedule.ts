import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const MANILA = 'Asia/Manila';

/** ISO timestamp → calendar date for the shared DatePicker (Asia/Manila day). */
export function announcementScheduleToDate(iso: string | null | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const trimmed = iso.trim();
  const ymd = trimmed.slice(0, 10);
  const fromYmd = dayjs.tz(ymd, 'YYYY-MM-DD', MANILA);
  if (fromYmd.isValid()) return fromYmd.toDate();
  const parsed = dayjs(trimmed);
  if (!parsed.isValid()) return undefined;
  return parsed.tz(MANILA).startOf('day').toDate();
}

/** Start of the selected calendar day in Asia/Manila. */
export function announcementScheduleStartFromDate(date: Date): string {
  return dayjs(date).tz(MANILA).startOf('day').toISOString();
}

/** End of the selected calendar day in Asia/Manila. */
export function announcementScheduleEndFromDate(date: Date): string {
  return dayjs(date).tz(MANILA).endOf('day').toISOString();
}
