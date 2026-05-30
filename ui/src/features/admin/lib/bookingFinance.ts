import type { BookingRow, SdSettlementLineItem } from '@/features/admin/lib/types';
import { computeTotalGuestBalance, guestBalancePaidRecorded } from '@/features/admin/lib/totalGuestBalance';

export type BookingFinancials = {
  totalGuestBalance: number | null;
  guestCollected: number;
  guestUnpaid: number | null;
  stayRevenue: number | null;
  parkingMargin: number | null;
  sdExpenseTotal: number;
  sdProfitTotal: number;
  voucherCost: number;
  hostProfit: number;
  hostExpenses: number;
  hostNet: number;
  projectedNet: number | null;
  isCompleted: boolean;
  isRealized: boolean;
};

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? 0 : n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumSdLineAmounts(items: ReadonlyArray<{ amount: number }>): number {
  return items.reduce((acc, row) => {
    const a = row.amount;
    return acc + (Number.isFinite(a) ? a : 0);
  }, 0);
}

function parseSdLineItemsFromBooking(
  json: SdSettlementLineItem[] | null | undefined,
): SdSettlementLineItem[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  return json.map((row) => ({
    label: typeof row.label === 'string' ? row.label : '',
    amount: toMoneyNumber(row.amount),
  }));
}

function parseSdNumberArray(arr: number[] | null | undefined): number[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => toMoneyNumber(x));
}

export function buildSdExpenseProfitRows(booking: BookingRow): {
  expenses: SdSettlementLineItem[];
  profits: SdSettlementLineItem[];
} {
  const expJson = parseSdLineItemsFromBooking(booking.sd_additional_expense_items);
  const profJson = parseSdLineItemsFromBooking(booking.sd_additional_profit_items);
  const expFallback = parseSdNumberArray(booking.sd_additional_expenses).map(
    (amount, i) => ({
      label: `Expense line ${i + 1}`,
      amount,
    }),
  );
  const profFallback = parseSdNumberArray(booking.sd_additional_profits).map(
    (amount, i) => ({
      label: `Profit line ${i + 1}`,
      amount,
    }),
  );
  return {
    expenses: expJson.length ? expJson : expFallback,
    profits: profJson.length ? profJson : profFallback,
  };
}

/**
 * Canonical per-booking financial breakdown for finance reports and pricing card.
 */
export function computeBookingFinancials(booking: BookingRow): BookingFinancials {
  const isCompleted = booking.status === 'COMPLETED';
  const totalGuestBalance = computeTotalGuestBalance(booking);
  const guestCollected = guestBalancePaidRecorded(booking);
  const guestUnpaid =
    totalGuestBalance != null
      ? roundMoney(totalGuestBalance - guestCollected)
      : null;

  const deposit = toMoneyNumber(booking.security_deposit);
  const parkingGuest = toMoneyNumber(booking.parking_rate_guest);
  const parkingPaid = toMoneyNumber(booking.parking_rate_paid);
  const parkingMargin = roundMoney(parkingGuest - parkingPaid);

  const { expenses, profits } = buildSdExpenseProfitRows(booking);
  const sdExpenseTotal = roundMoney(sumSdLineAmounts(expenses));
  const sdProfitTotal = roundMoney(sumSdLineAmounts(profits));
  const voucherCost =
    booking.next_stay_voucher_code?.trim()
      ? roundMoney(toMoneyNumber(booking.next_stay_voucher_amount))
      : 0;

  const stayRevenue =
    guestCollected > 0 || isCompleted
      ? roundMoney(guestCollected - deposit)
      : null;

  let hostProfit = 0;
  let hostExpenses = 0;
  let hostNet = 0;

  if (isCompleted) {
    hostProfit = roundMoney(guestCollected - deposit + sdProfitTotal);
    hostExpenses = roundMoney(sdExpenseTotal + parkingPaid + voucherCost);
    hostNet = roundMoney(hostProfit - hostExpenses);
  }

  let projectedNet: number | null = null;
  if (!isCompleted && totalGuestBalance != null) {
    projectedNet = roundMoney(totalGuestBalance - deposit - parkingPaid);
  }

  return {
    totalGuestBalance,
    guestCollected,
    guestUnpaid,
    stayRevenue,
    parkingMargin,
    sdExpenseTotal,
    sdProfitTotal,
    voucherCost,
    hostProfit,
    hostExpenses,
    hostNet,
    projectedNet,
    isCompleted,
    isRealized: isCompleted,
  };
}
