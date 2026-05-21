/**
 * Same formula as the admin UI `computeTotalGuestBalance`:
 * booking_rate − down_payment + security_deposit + pet_fee + parking_rate_guest + guest_additional_fee.
 */

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function computeTotalGuestBalanceFromBooking(
  booking: Record<string, unknown>,
): number | null {
  const raw = booking.booking_rate;
  if (raw === null || raw === undefined || raw === '') return null;
  const rate = num(raw);
  return (
    rate -
    num(booking.down_payment) +
    num(booking.security_deposit) +
    num(booking.pet_fee) +
    num(booking.parking_rate_guest) +
    num(booking.guest_additional_fee)
  );
}

/** Payment receipt is required only when the guest owes a positive balance. */
export function guestBalancePaymentReceiptRequired(totalDue: number): boolean {
  return Math.round(totalDue * 100) !== 0;
}

export type GuestBalanceSettlementCheck =
  | { ok: true; paidAmount: number; receiptUrl: string | null }
  | { ok: false; reason: string };

/**
 * Validates RFCI → READY_FOR_CHECKOUT settlement (admin UI, orchestrator, sd-refund-cron).
 * When total guest balance is ₱0, paid must be 0 and receipt is optional.
 */
export function checkGuestBalanceSettlement(
  booking: Record<string, unknown>,
  fields?: {
    paidAmount?: unknown;
    receiptUrl?: unknown;
  },
): GuestBalanceSettlementCheck {
  const totalDue = computeTotalGuestBalanceFromBooking(booking);
  if (totalDue === null) {
    return { ok: false, reason: 'missing_total_guest_balance' };
  }

  const paidRaw =
    fields?.paidAmount !== undefined
      ? fields.paidAmount
      : booking.guest_balance_paid_amount;
  const balCents = Math.round(totalDue * 100);
  let paidNum: number;
  if (paidRaw === null || paidRaw === undefined || paidRaw === '') {
    if (balCents === 0) {
      paidNum = 0;
    } else {
      return { ok: false, reason: 'missing_guest_balance_paid_amount' };
    }
  } else {
    paidNum = Number(paidRaw);
    if (Number.isNaN(paidNum) || paidNum < 0) {
      return { ok: false, reason: 'invalid_guest_balance_paid_amount' };
    }
  }

  const paidCents = Math.round(paidNum * 100);
  if (paidCents > balCents) {
    return { ok: false, reason: 'guest_balance_paid_exceeds_balance' };
  }
  if (paidCents !== balCents) {
    return { ok: false, reason: 'guest_balance_not_fully_paid' };
  }

  const receiptRaw =
    fields?.receiptUrl !== undefined
      ? fields.receiptUrl
      : booking.guest_balance_payment_receipt_url;
  const receipt =
    typeof receiptRaw === 'string' ? receiptRaw.trim() : '';
  if (guestBalancePaymentReceiptRequired(totalDue) && !receipt) {
    return { ok: false, reason: 'missing_guest_balance_payment_receipt' };
  }

  return {
    ok: true,
    paidAmount: paidNum,
    receiptUrl: receipt || null,
  };
}
