import {
  createDisabledDateMatcher,
  stringToDate,
  type BookedDateRange,
} from '@/utils/format/dates';

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** First booked check-in strictly after `fromDate` — caps checkout hover/selection. */
export function getFirstBlockingCheckIn(
  bookedDates: BookedDateRange[],
  fromDate: Date
): Date | null {
  let firstBlocking: Date | null = null;
  const from = toMidnight(fromDate);

  for (const booking of bookedDates) {
    try {
      const bookingCheckIn = toMidnight(stringToDate(booking.checkInDate));
      if (bookingCheckIn > from && (!firstBlocking || bookingCheckIn < firstBlocking)) {
        firstBlocking = bookingCheckIn;
      }
    } catch {
      // skip malformed row
    }
  }

  return firstBlocking;
}

/** Occupied night inside a booking (excludes turnover check-in days for checkout). */
export function isDateBookedForCheckoutSelection(
  bookedDates: BookedDateRange[],
  date: Date
): boolean {
  return bookedDates.some((booking) => {
    try {
      const bookingCheckIn = toMidnight(stringToDate(booking.checkInDate));
      const bookingCheckOut = toMidnight(stringToDate(booking.checkOutDate));
      const dateToCheck = toMidnight(date);
      return dateToCheck > bookingCheckIn && dateToCheck < bookingCheckOut;
    } catch {
      return false;
    }
  });
}

/** Matches operational `/calendar` disable rules for check-in vs check-out selection. */
export function isGuestCalendarDateDisabled(
  bookedDates: BookedDateRange[],
  date: Date,
  checkIn: Date | null,
  checkOut: Date | null,
  today: Date = toMidnight(new Date())
): boolean {
  const d = toMidnight(date);
  if (d < today) return true;

  if (checkIn && !checkOut) {
    const ci = toMidnight(checkIn);
    if (d <= ci) return true;
    if (isDateBookedForCheckoutSelection(bookedDates, date)) return true;

    const firstBlocking = getFirstBlockingCheckIn(bookedDates, checkIn);
    if (firstBlocking && d > firstBlocking) return true;

    return false;
  }

  return createDisabledDateMatcher(bookedDates, null)(date);
}

/** True when `date` may be chosen as check-out after `checkIn` (includes same-day turnover). */
export function isGuestCalendarValidCheckoutDate(
  bookedDates: BookedDateRange[],
  date: Date,
  checkIn: Date,
  today: Date = toMidnight(new Date())
): boolean {
  return !isGuestCalendarDateDisabled(bookedDates, date, checkIn, null, today);
}

export function isGuestCalendarCheckInBlocked(bookedDates: BookedDateRange[], date: Date): boolean {
  return createDisabledDateMatcher(bookedDates, null)(date);
}

/** Hover cap while selecting check-out — never preview an illegal range. */
export function clampGuestCalendarCheckoutHover(
  bookedDates: BookedDateRange[],
  checkIn: Date,
  hoverDate: Date,
  today: Date = toMidnight(new Date())
): Date | null {
  const ci = toMidnight(checkIn);
  const hd = toMidnight(hoverDate);
  if (hd <= ci) return null;

  const cursor = new Date(ci);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= hd) {
    if (isGuestCalendarDateDisabled(bookedDates, cursor, checkIn, null, today)) {
      const cap = new Date(cursor);
      cap.setDate(cap.getDate() - 1);
      return cap <= ci ? null : cap;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return hd;
}

/** True when any occupied night strictly between check-in and check-out is blocked. */
export function hasBlockedNightBetween(
  bookedDates: BookedDateRange[],
  from: Date,
  to: Date
): boolean {
  const cursor = new Date(from);
  cursor.setDate(cursor.getDate() + 1);
  const end = toMidnight(to);

  while (cursor < end) {
    if (isDateBookedForCheckoutSelection(bookedDates, cursor)) return true;
    if (createDisabledDateMatcher(bookedDates, null)(cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

// ponytail: dev-only guard — turnover checkout on next guest's check-in day must stay allowed
if (import.meta.env.DEV) {
  const turnoverBooked = [{ id: '1', checkInDate: '2026-08-07', checkOutDate: '2026-08-10' }];
  const turnoverCheckIn = toMidnight(new Date(2026, 7, 6));
  const turnoverCheckout = toMidnight(new Date(2026, 7, 7));
  if (
    !isGuestCalendarValidCheckoutDate(turnoverBooked, turnoverCheckout, turnoverCheckIn) ||
    hasBlockedNightBetween(turnoverBooked, turnoverCheckIn, turnoverCheckout)
  ) {
    throw new Error(
      'guestCalendarAvailability: turnover checkout on booked check-in day must stay allowed'
    );
  }
}
