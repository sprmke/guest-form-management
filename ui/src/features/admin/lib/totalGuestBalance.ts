import type { BookingRow } from '@/features/admin/lib/types';

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? 0 : n;
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
    toMoneyNumber(booking.pet_fee) +
    toMoneyNumber(booking.parking_rate_guest) +
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

function sumSdLineAmounts(
  items: ReadonlyArray<{ amount: number }>,
): number {
  return items.reduce((acc, row) => {
    const a = row.amount;
    return acc + (Number.isFinite(a) ? a : 0);
  }, 0);
}

/**
 * Host-side totals after the stay is **COMPLETED** (admin pricing card).
 *
 * - **Total profit** = balance amount paid − security deposit + sum(SD additional profits)
 * - **Total expenses** = sum(SD additional expenses)
 * - **Total net** = total profit − total expenses
 */
export function computeCompletedStayProfitLoss(
  booking: BookingRow,
  sdProfitLines: ReadonlyArray<{ amount: number }>,
  sdExpenseLines: ReadonlyArray<{ amount: number }>,
): { totalProfit: number; totalExpenses: number; totalNet: number } {
  const paid = guestBalancePaidRecorded(booking);
  const deposit = toMoneyNumber(booking.security_deposit);
  const profitExtras = sumSdLineAmounts(sdProfitLines);
  const expenseSum = sumSdLineAmounts(sdExpenseLines);
  const totalProfit = paid - deposit + profitExtras;
  const totalExpenses = expenseSum;
  const totalNet = totalProfit - totalExpenses;
  return {
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
  };
}
