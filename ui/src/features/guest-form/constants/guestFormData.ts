import { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import {
  getDefaultDates,
  formatDateToYYYYMMDD,
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
    numberOfAdults: 2,
    numberOfChildren: 0,
    guestSpecialRequests: '',
    guestRequestsSurpriseDecor: false,
    findUs: 'Facebook',
    needParking: false,
    parkingSameAsBookingDuration: true,
    hasPets: false,
    petType: 'Dog',
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
