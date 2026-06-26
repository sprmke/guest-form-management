import { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import { DEFAULT_GUEST_AGE } from "@/features/guest-form/lib/guestCounts";
import {
  getDefaultDates,
  formatDateToYYYYMMDD,
  getManilaYmdToday,
  normalizeDateString,
} from '@/utils/dates';

const { today, tomorrow } = getDefaultDates();

export const defaultFormValues: Partial<GuestFormData> = {
    guestFacebookName: '',
    primaryGuestName: '',
    guestEmail: '',
    guestPhoneNumber: '',
    guestAddress: '',
    checkInDate: formatDateToYYYYMMDD(today),
    checkOutDate: formatDateToYYYYMMDD(tomorrow),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    nationality: 'Filipino',
    numberOfAdults: 1,
    numberOfChildren: 0,
    primaryGuestAge: DEFAULT_GUEST_AGE,
    guestSpecialRequests: '',
    guestRequestsSurpriseDecor: false,
    findUs: 'Facebook',
    needParking: false,
    parkingSameAsBookingDuration: true,
    hasPets: false,
    petType: 'Dog',
    petVaccinationDate: getManilaYmdToday(),
  };

/**
 * Seeds check-in / check-out from `/form?checkInDate=&checkOutDate=` (calendar
 * handoff). Ignored when `bookingId` is present (existing booking load path).
 */
export function getGuestFormDefaultValuesFromSearchParams(
  sp: URLSearchParams,
): Partial<GuestFormData> {
  const base: Partial<GuestFormData> = { ...defaultFormValues };
  if (sp.get('bookingId')?.trim()) return base;

  const rawIn = sp.get('checkInDate')?.trim();
  const rawOut = sp.get('checkOutDate')?.trim();
  if (!rawIn || !rawOut) return base;

  const checkInDate = normalizeDateString(rawIn);
  const checkOutDate = normalizeDateString(rawOut);
  if (checkInDate && checkOutDate) {
    base.checkInDate = checkInDate;
    base.checkOutDate = checkOutDate;
  }
  return base;
}
