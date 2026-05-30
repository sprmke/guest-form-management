import type { BookingRow } from '@/features/admin/lib/types';
import {
  buildSdExpenseProfitRows,
  computeBookingFinancials,
} from '@/features/admin/lib/bookingFinance';

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? 0 : n;
}

function bookingFlagTrue(value: boolean | string | null | undefined): boolean {
  return value === true || value === 'true';
}

/** Pet fee counts toward guest balance only when the guest is bringing pets. */
export function petFeeForGuestBalance(booking: BookingRow): number {
  return bookingFlagTrue(booking.has_pets)
    ? toMoneyNumber(booking.pet_fee)
    : 0;
}

/** Parking fee counts toward guest balance only when the guest needs parking. */
export function parkingFeeForGuestBalance(booking: BookingRow): number {
  return bookingFlagTrue(booking.need_parking)
    ? toMoneyNumber(booking.parking_rate_guest)
    : 0;
}

/**
 * Total amount due from the guest before check-in (matches `ReviewPricingForm`
 * live total and `PricingSummaryCard` on the booking detail page).
 *
 * `guest_submissions.balance` is the recorded “balance” line item only; this sum
 * is what admins mean by **Total guest balance** for settlement.
 */
/** Payment receipt is required only when the guest owes a positive balance. */
export function guestBalancePaymentReceiptRequired(totalDue: number): boolean {
  return Math.round(totalDue * 100) !== 0;
}

export function computeTotalGuestBalance(booking: BookingRow): number | null {
  if (booking.booking_rate == null || booking.booking_rate === '') return null;
  const rate = toMoneyNumber(booking.booking_rate);
  return (
    rate -
    toMoneyNumber(booking.down_payment) +
    toMoneyNumber(booking.security_deposit) +
    petFeeForGuestBalance(booking) +
    parkingFeeForGuestBalance(booking) +
    toMoneyNumber(booking.guest_additional_fee)
  );
}

/** Amount recorded toward **total guest balance** (RFCI → SD details settlement). */
export function guestBalancePaidRecorded(booking: BookingRow): number {
  const raw = booking.guest_balance_paid_amount;
  if (raw === null || raw === undefined || raw === '') return 0;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Host-side totals after the stay is **COMPLETED** (admin pricing card).
 * Delegates to `computeBookingFinancials` (includes parking paid + voucher cost in expenses).
 */
export function computeCompletedStayProfitLoss(
  booking: BookingRow,
  _sdProfitLines?: ReadonlyArray<{ amount: number }>,
  _sdExpenseLines?: ReadonlyArray<{ amount: number }>,
): { totalProfit: number; totalExpenses: number; totalNet: number } {
  const { hostProfit, hostExpenses, hostNet } = computeBookingFinancials(booking);
  return {
    totalProfit: hostProfit,
    totalExpenses: hostExpenses,
    totalNet: hostNet,
  };
}

export { buildSdExpenseProfitRows };
