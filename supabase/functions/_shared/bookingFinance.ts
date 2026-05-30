/**
 * Server mirror of ui/src/features/admin/lib/bookingFinance.ts — keep formulas in sync.
 */

import { computeTotalGuestBalanceFromBooking } from './totalGuestBalance.ts';

export type SdSettlementLineItem = { label: string; amount: number };

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

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumSdLineAmounts(items: ReadonlyArray<{ amount: number }>): number {
  return items.reduce((acc, row) => acc + (Number.isFinite(row.amount) ? row.amount : 0), 0);
}

function parseSdLineItemsFromBooking(json: unknown): SdSettlementLineItem[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  return json.map((row) => {
    if (typeof row !== 'object' || row === null) return { label: '', amount: 0 };
    const r = row as Record<string, unknown>;
    return {
      label: typeof r.label === 'string' ? r.label : '',
      amount: num(r.amount),
    };
  });
}

function parseSdNumberArray(arr: unknown): number[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => num(x));
}

export function buildSdExpenseProfitRows(booking: Record<string, unknown>): {
  expenses: SdSettlementLineItem[];
  profits: SdSettlementLineItem[];
} {
  const expJson = parseSdLineItemsFromBooking(booking.sd_additional_expense_items);
  const profJson = parseSdLineItemsFromBooking(booking.sd_additional_profit_items);
  const expFallback = parseSdNumberArray(booking.sd_additional_expenses).map(
    (amount, i) => ({ label: `Expense line ${i + 1}`, amount }),
  );
  const profFallback = parseSdNumberArray(booking.sd_additional_profits).map(
    (amount, i) => ({ label: `Profit line ${i + 1}`, amount }),
  );
  return {
    expenses: expJson.length ? expJson : expFallback,
    profits: profJson.length ? profJson : profFallback,
  };
}

function guestBalancePaidRecorded(booking: Record<string, unknown>): number {
  const raw = booking.guest_balance_paid_amount;
  if (raw === null || raw === undefined || raw === '') return 0;
  const n = num(raw);
  if (n < 0) return 0;
  return roundMoney(n);
}

export function computeBookingFinancials(
  booking: Record<string, unknown>,
): BookingFinancials {
  const status = String(booking.status ?? '');
  const isCompleted = status === 'COMPLETED';
  const totalGuestBalance = computeTotalGuestBalanceFromBooking(booking);
  const guestCollected = guestBalancePaidRecorded(booking);
  const guestUnpaid =
    totalGuestBalance != null
      ? roundMoney(totalGuestBalance - guestCollected)
      : null;

  const deposit = num(booking.security_deposit);
  const parkingGuest = num(booking.parking_rate_guest);
  const parkingPaid = num(booking.parking_rate_paid);
  const parkingMargin = roundMoney(parkingGuest - parkingPaid);

  const { expenses, profits } = buildSdExpenseProfitRows(booking);
  const sdExpenseTotal = roundMoney(sumSdLineAmounts(expenses));
  const sdProfitTotal = roundMoney(sumSdLineAmounts(profits));
  const voucherCode =
    typeof booking.next_stay_voucher_code === 'string'
      ? booking.next_stay_voucher_code.trim()
      : '';
  const voucherCost = voucherCode ? roundMoney(num(booking.next_stay_voucher_amount)) : 0;

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
