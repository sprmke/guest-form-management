import type { UpdateBookingPayload } from '@/features/admin/hooks/useUpdateBooking';
import type { BookingRow } from '@/features/admin/lib/types';
import { normalizeDateString } from '@/utils/dates';

function trimText(v: string | null | undefined): string {
  return (v ?? '').trim();
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return trimText(a) === trimText(b);
}

function sameBool(a: boolean | null | undefined, b: boolean | null | undefined): boolean {
  return !!a === !!b;
}

/** Match DB 12h / 24h / HH:mm:ss into HH:mm for comparison with admin form time inputs. */
function timeForCompare(value: string | null | undefined): string {
  const raw = trimText(value);
  if (!raw) return '';

  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);

  const m = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return '';
  const hour12 = Number(m[1]);
  const minute = m[2];
  const ampm = m[3].toUpperCase();
  let hour24 = hour12 % 12;
  if (ampm === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

function normDate(d: string | null | undefined): string {
  const s = trimText(d);
  if (!s) return '';
  return normalizeDateString(s);
}

/**
 * True when `v` differs from `booking` on any field that should force
 * status → PENDING_REVIEW while the booking is in the documents pipeline or
 * Ready for check-in (see docs/TODOS.md + booking-workflow.mdc §2.3).
 * Document replacements use `upload-booking-asset` instead of this payload.
 */
export function hasWorkflowSensitiveGuestFieldDiff(
  booking: BookingRow,
  v: UpdateBookingPayload,
): boolean {
  if (!sameText(booking.guest_facebook_name, v.guest_facebook_name)) return true;
  if (!sameText(booking.primary_guest_name, v.primary_guest_name)) return true;
  if (!sameText(booking.guest_email, v.guest_email)) return true;
  if (!sameText(booking.guest_phone_number, v.guest_phone_number)) return true;

  if (!sameText(booking.guest2_name, v.guest2_name ?? null)) return true;
  if (!sameText(booking.guest3_name, v.guest3_name ?? null)) return true;
  if (!sameText(booking.guest4_name, v.guest4_name ?? null)) return true;
  if (!sameText(booking.guest5_name, v.guest5_name ?? null)) return true;

  if (normDate(booking.check_in_date) !== normDate(v.check_in_date ?? '')) return true;
  if (normDate(booking.check_out_date) !== normDate(v.check_out_date ?? '')) return true;

  if (timeForCompare(booking.check_in_time) !== timeForCompare(v.check_in_time ?? '')) {
    return true;
  }
  if (timeForCompare(booking.check_out_time) !== timeForCompare(v.check_out_time ?? '')) {
    return true;
  }

  if (!sameBool(booking.guest_requests_surprise_decor, v.guest_requests_surprise_decor)) {
    return true;
  }

  if (!sameBool(booking.need_parking, v.need_parking)) return true;
  if (v.need_parking) {
    if (!sameText(booking.car_plate_number, v.car_plate_number)) return true;
    if (!sameText(booking.car_brand_model, v.car_brand_model)) return true;
    if (!sameText(booking.car_color, v.car_color)) return true;
  }

  if (!sameBool(booking.has_pets, v.has_pets)) return true;
  if (v.has_pets) {
    if (!sameText(booking.pet_name, v.pet_name)) return true;
    if (!sameText(booking.pet_type, v.pet_type)) return true;
    if (!sameText(booking.pet_breed, v.pet_breed)) return true;
    if (!sameText(booking.pet_age, v.pet_age)) return true;
    if (normDate(booking.pet_vaccination_date) !== normDate(v.pet_vaccination_date ?? '')) {
      return true;
    }
  }

  return false;
}
