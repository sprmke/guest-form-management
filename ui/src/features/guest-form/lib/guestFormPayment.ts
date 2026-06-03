import type { GuestFormData } from '@/features/guest-form/schemas/guestFormSchema';
import {
  bookingStayNights,
  countParkingNights,
} from '@/features/pay-parking/lib/payParkingHelpers';
import { toGuestSubmissionDate } from '@/utils/dates';

export const GUEST_DOWN_PAYMENT_RATE_PER_NIGHT = 1500;
export const GUEST_PARKING_RATE_PER_NIGHT = 400;

export type GuestFormPaymentBreakdown = {
  stayNights: number;
  staySubtotal: number;
  parkingNights: number | null;
  parkingSubtotal: number | null;
  total: number;
};

export function computeGuestFormPaymentBreakdown(
  values: Pick<
    GuestFormData,
    | 'checkInDate'
    | 'checkOutDate'
    | 'needParking'
    | 'parkingSameAsBookingDuration'
    | 'parkingCheckInDate'
    | 'parkingCheckOutDate'
  >,
): GuestFormPaymentBreakdown {
  const stayNights = countParkingNights(
    toGuestSubmissionDate(values.checkInDate),
    toGuestSubmissionDate(values.checkOutDate),
  );
  const staySubtotal = GUEST_DOWN_PAYMENT_RATE_PER_NIGHT * stayNights;

  let parkingNights: number | null = null;
  let parkingSubtotal: number | null = null;

  if (values.needParking) {
    const allowCustomParkingDates =
      bookingStayNights({
        check_in_date: toGuestSubmissionDate(values.checkInDate),
        check_out_date: toGuestSubmissionDate(values.checkOutDate),
      }) > 1;
    const usesBookingStayDates =
      !allowCustomParkingDates ||
      values.parkingSameAsBookingDuration !== false;

    const effectiveCheckIn = usesBookingStayDates
      ? values.checkInDate
      : values.parkingCheckInDate || values.checkInDate;
    const effectiveCheckOut = usesBookingStayDates
      ? values.checkOutDate
      : values.parkingCheckOutDate || values.checkOutDate;

    parkingNights = countParkingNights(
      toGuestSubmissionDate(effectiveCheckIn),
      toGuestSubmissionDate(effectiveCheckOut),
    );
    parkingSubtotal = GUEST_PARKING_RATE_PER_NIGHT * parkingNights;
  }

  return {
    stayNights,
    staySubtotal,
    parkingNights,
    parkingSubtotal,
    total: staySubtotal + (parkingSubtotal ?? 0),
  };
}
