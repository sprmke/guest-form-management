import type { GuestFormData } from '@/features/guest/form/schemas/guestFormSchema';
import { countParkingNights } from '@/features/guest/pay-parking/lib/payParkingHelpers';

import { toGuestSubmissionDate } from '@/utils/format/dates';

export const GUEST_DOWN_PAYMENT_RATE_PER_NIGHT = 1500;

export type GuestFormPaymentBreakdown = {
  stayNights: number;
  staySubtotal: number;
  total: number;
};

/**
 * Phase 7: parking is a pure interest signal on the guest form, priced and paid for
 * separately through the marketplace once the booking is confirmed — no parking line item
 * in the downpayment total here anymore.
 */
export function computeGuestFormPaymentBreakdown(
  values: Pick<GuestFormData, 'checkInDate' | 'checkOutDate'>
): GuestFormPaymentBreakdown {
  const stayNights = countParkingNights(
    toGuestSubmissionDate(values.checkInDate),
    toGuestSubmissionDate(values.checkOutDate)
  );
  const staySubtotal = GUEST_DOWN_PAYMENT_RATE_PER_NIGHT * stayNights;

  return {
    stayNights,
    staySubtotal,
    total: staySubtotal,
  };
}
