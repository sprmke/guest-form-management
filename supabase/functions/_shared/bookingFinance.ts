/**
 * Server mirror of ui/src/features/admin/lib/bookingFinance.ts — keep formulas in sync.
 */

import { computeTotalGuestBalanceFromBooking } from './totalGuestBalance.ts';

export type SdSettlementLineItem = { label: string; amount: number };

export type BookingFinancials = {
  /** Down payment + guest balance. */
  bookingRate: number | null;
  /** Pet + parking margin + additional + SD net (completed or refund recorded). */
  otherFees: number;
  totalGuestBalance: number | null;
  guestCollected: number;
  guestUnpaid: number | null;
  /** Balance paid minus security deposit — host stay fees only (COMPLETED). */
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

function bookingFlagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}

function petFeeForHostNet(booking: Record<string, unknown>): number {
  return bookingFlagTrue(booking.has_pets) ? num(booking.pet_fee) : 0;
}

function parkingFeeForHostNet(booking: Record<string, unknown>): number {
  return bookingFlagTrue(booking.need_parking)
    ? num(booking.parking_rate_guest)
    : 0;
}

function guestBalanceForStayDisplay(
  booking: Record<string, unknown>,
): number | null {
  const rate = booking.booking_rate;
  if (rate !== null && rate !== undefined && rate !== '') {
    return roundMoney(num(rate) - num(booking.down_payment));
  }
  const balance = booking.balance;
  if (balance !== null && balance !== undefined && balance !== '') {
    return roundMoney(num(balance));
  }
  return null;
}

export function bookingRateForDisplay(booking: Record<string, unknown>): number | null {
  const guestBalance = guestBalanceForStayDisplay(booking);
  if (guestBalance == null) return null;
  return roundMoney(num(booking.down_payment) + guestBalance);
}

function sdNetForOtherFeesDisplay(booking: Record<string, unknown>): number {
  const deposit = num(booking.security_deposit);
  const sdRefund = num(booking.sd_refund_amount);
  if (String(booking.status ?? '') !== 'COMPLETED' && sdRefund === 0) {
    return 0;
  }
  return roundMoney(deposit - sdRefund);
}

function otherFeesForDisplay(booking: Record<string, unknown>): number {
  const pet = petFeeForHostNet(booking);
  const parkingMargin = bookingFlagTrue(booking.need_parking)
    ? roundMoney(
        parkingFeeForHostNet(booking) - num(booking.parking_rate_paid),
      )
    : 0;
  const additional = num(booking.guest_additional_fee);
  return roundMoney(
    pet + parkingMargin + additional + sdNetForOtherFeesDisplay(booking),
  );
}

function guestBalanceForHostNet(booking: Record<string, unknown>): number | null {
  return guestBalanceForStayDisplay(booking);
}

function computeHostNetComponents(
  booking: Record<string, unknown>,
  options: { includeSdRefund: boolean } = { includeSdRefund: true },
): number {
  const deposit = num(booking.security_deposit);
  const down = num(booking.down_payment);
  const guestBalance = guestBalanceForHostNet(booking) ?? 0;
  const pet = petFeeForHostNet(booking);
  const additional = num(booking.guest_additional_fee);
  const parkingGuest = parkingFeeForHostNet(booking);
  const parkingPaid = num(booking.parking_rate_paid);
  const sdRefund = options.includeSdRefund ? num(booking.sd_refund_amount) : 0;

  return roundMoney(
    down +
      guestBalance +
      parkingGuest +
      pet +
      additional +
      deposit -
      parkingPaid -
      sdRefund,
  );
}

export function financeDisplayNet(fin: BookingFinancials): number | null {
  if (fin.isCompleted) return fin.hostNet;
  return fin.projectedNet;
}

/** Admin dashboard net profit: realized hostNet, else booking rate + other fees (held SD excluded). */
export function dashboardNetProfitKpi(
  booking: Record<string, unknown>,
): number {
  const fin = computeBookingFinancials(booking);
  if (fin.isCompleted) return fin.hostNet;
  return roundMoney((fin.bookingRate ?? 0) + fin.otherFees);
}

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
  const parkingMargin = bookingFlagTrue(booking.need_parking)
    ? roundMoney(parkingGuest - parkingPaid)
    : null;

  const { expenses, profits } = buildSdExpenseProfitRows(booking);
  const sdExpenseTotal = roundMoney(sumSdLineAmounts(expenses));
  const sdProfitTotal = roundMoney(sumSdLineAmounts(profits));
  const voucherCode =
    typeof booking.next_stay_voucher_code === 'string'
      ? booking.next_stay_voucher_code.trim()
      : '';
  const voucherCost = voucherCode ? roundMoney(num(booking.next_stay_voucher_amount)) : 0;

  const stayRevenue = isCompleted
    ? roundMoney(guestCollected - deposit)
    : null;

  const hostInflows = roundMoney(
    num(booking.down_payment) +
      (guestBalanceForHostNet(booking) ?? 0) +
      parkingFeeForHostNet(booking) +
      petFeeForHostNet(booking) +
      num(booking.guest_additional_fee) +
      deposit,
  );
  const sdRefund = num(booking.sd_refund_amount);

  let hostProfit = 0;
  let hostExpenses = 0;
  let hostNet = 0;

  if (isCompleted) {
    hostProfit = hostInflows;
    hostExpenses = roundMoney(parkingPaid + sdRefund);
    hostNet = computeHostNetComponents(booking, { includeSdRefund: true });
  }

  let projectedNet: number | null = null;
  if (!isCompleted) {
    projectedNet = computeHostNetComponents(booking, { includeSdRefund: false });
  }

  return {
    bookingRate: bookingRateForDisplay(booking),
    otherFees: otherFeesForDisplay(booking),
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
