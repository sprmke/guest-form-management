import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { parse, startOfDay } from "date-fns";

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to Asia/Manila
dayjs.tz.setDefault("Asia/Manila");

/** User-facing date in pickers and ISO date inputs (slashes). */
export const DATE_PICKER_DISPLAY_FORMAT = "MM/DD/YYYY";

/** date-fns pattern matching {@link DATE_PICKER_DISPLAY_FORMAT}. */
export const DATE_FNS_PICKER_DISPLAY_FORMAT = "MM/dd/yyyy";

// Format date to YYYY-MM-DD
export const formatDateToYYYYMMDD = (date: Date) =>
  dayjs(date).format("YYYY-MM-DD");

/** ISO `YYYY-MM-DD` → `MM/DD/YYYY` for date picker display. */
export function formatIsoDateForDisplay(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const d = dayjs(iso.slice(0, 10), "YYYY-MM-DD", true);
  if (!d.isValid()) return "";
  return d.format(DATE_PICKER_DISPLAY_FORMAT);
}

export const formatDateToMMDDYYYY = (dateString: string): string => {
  try {
    if (!dateString) return "";
    const date = dayjs(dateString);
    if (!date.isValid()) return "";

    return date.format("MM-DD-YYYY");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

export const formatDateToLongFormat = (dateString: string): string => {
  try {
    if (!dateString) return "";
    const date = dayjs(dateString);
    if (!date.isValid()) return "";

    return date.format("MMM D, YYYY");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

/** User-facing 12-hour time (e.g. `2:00 PM`). Accepts DB `HH:mm` or legacy `h:mm A`. */
export const formatTimeToAMPM = (
  time: string,
  isCheckIn: boolean = false,
): string => {
  const fallback = isCheckIn ? "2:00 PM" : "11:00 AM";
  try {
    const s = (time ?? "").trim();
    if (!s) return fallback;

    const hm24 = toGuestSubmissionTime(s);
    if (/^\d{2}:\d{2}$/.test(hm24)) {
      const parsed = dayjs(`2000-01-01T${hm24}`);
      if (parsed.isValid()) return parsed.format("h:mm A");
    }

    const loose = dayjs(`2000-01-01 ${s}`);
    return loose.isValid() ? loose.format("h:mm A") : fallback;
  } catch (error) {
    console.error("Error formatting time:", error);
    return fallback;
  }
};

// Get today and tomorrow dates
export const getDefaultDates = () => {
  const today = dayjs();
  const tomorrow = today.add(1, "day");

  return {
    today: today.toDate(),
    tomorrow: tomorrow.toDate(),
  };
};

/** Today in Asia/Manila as YYYY-MM-DD (for Manila-aligned date inputs). */
export const getManilaYmdToday = () =>
  dayjs().tz("Asia/Manila").format("YYYY-MM-DD");

/** Next calendar day in Asia/Manila (YYYY-MM-DD). */
export const getManilaYmdTomorrow = () =>
  dayjs().tz("Asia/Manila").add(1, "day").format("YYYY-MM-DD");

export const getNextDay = (date: string) => {
  return dayjs(date).add(1, "day").format("YYYY-MM-DD");
};

// Type for booked date range
export interface BookedDateRange {
  id: string;
  checkInDate: string;
  checkOutDate: string;
}

// Normalize any date string to YYYY-MM-DD format
export const normalizeDateString = (dateString: string): string => {
  if (!dateString) return "";

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Handle M-DD-YYYY or MM-DD-YYYY format (e.g., "1-15-2026" or "01-15-2026")
  const mdyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Fallback: try to parse with dayjs and format
  const parsed = dayjs(dateString);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }

  return dateString;
};

// Convert date string (any format) to Date object
export const stringToDate = (dateString: string): Date => {
  const normalized = normalizeDateString(dateString);
  return parse(normalized, "yyyy-MM-dd", new Date());
};

// Convert Date object to YYYY-MM-DD string
export const dateToString = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DD");
};

/** `guest_submissions.valid_dates` — stored as MM-DD-YYYY text. */
export function toGuestSubmissionDate(text: string): string {
  const s = (text ?? "").trim();
  if (!s) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return dayjs(s, "YYYY-MM-DD", true).format("MM-DD-YYYY");
  }
  const normalized = normalizeDateString(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return dayjs(normalized, "YYYY-MM-DD", true).format("MM-DD-YYYY");
  }
  return s;
}

/** Normalize to 24-hour HH:mm for guest_submissions. */
export function toGuestSubmissionTime(text: string): string {
  const s = (text ?? "").trim();
  if (!s) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = ampm[2];
    const mer = ampm[3].toUpperCase();
    if (mer === "AM" && h === 12) h = 0;
    else if (mer === "PM" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const short = s.match(/^(\d{1,2}):(\d{2})$/);
  if (short) return `${short[1].padStart(2, "0")}:${short[2]}`;
  return s;
}

// Create a disabled date matcher for react-day-picker (for check-in dates)
export const createDisabledDateMatcher = (
  bookedDates: BookedDateRange[],
  currentBookingId?: string | null,
) => {
  return (date: Date) => {
    // Check if this date falls within any booked range
    return bookedDates.some((booking) => {
      // Skip checking against the current booking if we're editing
      if (currentBookingId && booking.id === currentBookingId) {
        return false;
      }

      try {
        const checkIn = stringToDate(booking.checkInDate);
        const checkOut = stringToDate(booking.checkOutDate);
        const dateToCheck = startOfDay(date);

        // Check if date is within the booked range (check-in inclusive, check-out exclusive)
        // This allows guests to check in on checkout dates
        return (
          dateToCheck >= startOfDay(checkIn) &&
          dateToCheck < startOfDay(checkOut)
        );
      } catch (e) {
        return false;
      }
    });
  };
};

// Create a disabled date matcher for checkout dates
// This allows selecting checkout dates that are check-in dates of other bookings
export const createDisabledCheckoutDateMatcher = (
  bookedDates: BookedDateRange[],
  currentBookingId?: string | null,
) => {
  return (date: Date) => {
    // Check if this date falls within any booked range
    return bookedDates.some((booking) => {
      // Skip checking against the current booking if we're editing
      if (currentBookingId && booking.id === currentBookingId) {
        return false;
      }

      try {
        const checkIn = stringToDate(booking.checkInDate);
        const checkOut = stringToDate(booking.checkOutDate);
        const dateToCheck = startOfDay(date);

        // For checkout dates: Only disable dates that are AFTER check-in and BEFORE check-out
        // This allows selecting a checkout date that matches another booking's check-in date
        // (Guest A checks out on Dec 15, Guest B checks in on Dec 15)
        return (
          dateToCheck > startOfDay(checkIn) &&
          dateToCheck < startOfDay(checkOut)
        );
      } catch (e) {
        return false;
      }
    });
  };
};
