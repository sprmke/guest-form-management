/**
 * Progress-form values + dirty detection for BookingEditForm saves.
 */

import type { GuestBalanceSettlementValues } from '@/features/admin/components/GuestBalanceSettlementForm';
import {
  resolveParkingFeeIncludedDefault,
  type ParkingRequestValues,
} from '@/features/admin/components/ParkingRequestForm';
import type { ReviewPricingFormValues } from '@/features/admin/components/ReviewPricingForm';
import type { SdRefundValues } from '@/features/admin/components/SdRefundForm';
import {
  guestSdRefundPayloadFromValues,
  type GuestSdRefundEditValues,
} from '@/features/admin/components/GuestSdRefundEditForm';
import type { UpdateBookingPayload } from '@/features/admin/hooks/useUpdateBooking';
import type { BookingRow } from '@/features/admin/lib/types';

export type ProgressFormEditState = {
  pricing: ReviewPricingFormValues | null;
  parking: ParkingRequestValues | null;
  guestBalance: GuestBalanceSettlementValues | null;
  sdRefundGuest: GuestSdRefundEditValues | null;
  sdSettlement: SdRefundValues | null;
};

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numsEqual(a: unknown, b: unknown): boolean {
  const na = toNum(a);
  const nb = toNum(b);
  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;
  return Math.round(na * 100) === Math.round(nb * 100);
}

function strEqual(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function lineItemsEqual(
  a: Array<{ label: string; amount: number }> | null | undefined,
  b: Array<{ label: string; amount: number }> | null | undefined,
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every(
    (row, i) =>
      strEqual(row.label, right[i]?.label) &&
      numsEqual(row.amount, right[i]?.amount),
  );
}

export function mergePricingIntoBooking(
  booking: BookingRow,
  pricing: ReviewPricingFormValues | null,
): BookingRow {
  if (!pricing) return booking;
  return {
    ...booking,
    booking_rate: pricing.booking_rate,
    down_payment: pricing.down_payment,
    security_deposit: pricing.security_deposit,
    pet_fee: booking.has_pets ? pricing.pet_fee : 0,
    parking_rate_guest: booking.need_parking ? pricing.parking_rate_guest : 0,
    guest_additional_fee: pricing.guest_additional_fee,
  };
}

export function isProgressFormDirty(
  booking: BookingRow,
  state: ProgressFormEditState,
): boolean {
  if (state.pricing) {
    const p = state.pricing;
    if (
      !numsEqual(p.booking_rate, booking.booking_rate) ||
      !numsEqual(p.down_payment, booking.down_payment) ||
      !numsEqual(p.security_deposit, booking.security_deposit) ||
      !numsEqual(
        booking.has_pets ? p.pet_fee : 0,
        booking.has_pets ? booking.pet_fee : 0,
      ) ||
      !numsEqual(
        booking.need_parking ? p.parking_rate_guest : 0,
        booking.need_parking ? booking.parking_rate_guest : 0,
      ) ||
      !numsEqual(p.guest_additional_fee, booking.guest_additional_fee)
    ) {
      return true;
    }
  }

  if (booking.need_parking && state.parking) {
    const pk = state.parking;
    if (
      !strEqual(pk.parking_owner, booking.parking_owner) ||
      !numsEqual(pk.parking_rate_paid, booking.parking_rate_paid) ||
      !strEqual(pk.parking_endorsement_url, booking.parking_endorsement_url) ||
      pk.parking_fee_included_in_downpayment !==
        resolveParkingFeeIncludedDefault(booking) ||
      !strEqual(
        pk.parking_fee_included_in_downpayment
          ? ''
          : pk.parking_payment_receipt_url,
        booking.parking_fee_included_in_downpayment !== false
          ? ''
          : booking.parking_payment_receipt_url,
      )
    ) {
      return true;
    }
  }

  if (state.guestBalance) {
    const gb = state.guestBalance;
    if (
      !numsEqual(gb.guest_balance_paid_amount, booking.guest_balance_paid_amount) ||
      !strEqual(
        gb.guest_balance_payment_receipt_url,
        booking.guest_balance_payment_receipt_url,
      )
    ) {
      return true;
    }
  }

  if (state.sdSettlement) {
    const sd = state.sdSettlement;
    const expFromBooking =
      booking.sd_additional_expense_items ??
      (Array.isArray(booking.sd_additional_expenses)
        ? booking.sd_additional_expenses.map((amount) => ({
            label: '',
            amount,
          }))
        : []);
    const profFromBooking =
      booking.sd_additional_profit_items ??
      (Array.isArray(booking.sd_additional_profits)
        ? booking.sd_additional_profits.map((amount) => ({
            label: '',
            amount,
          }))
        : []);

    if (
      !lineItemsEqual(sd.sd_additional_expense_items, expFromBooking) ||
      !lineItemsEqual(sd.sd_additional_profit_items, profFromBooking) ||
      !numsEqual(sd.sd_refund_amount, booking.sd_refund_amount) ||
      !strEqual(sd.sd_refund_receipt_url, booking.sd_refund_receipt_url)
    ) {
      return true;
    }
  }

  return false;
}

export function progressFormPayloadFromState(
  booking: BookingRow,
  state: ProgressFormEditState,
): Partial<UpdateBookingPayload> {
  const patch: Partial<UpdateBookingPayload> = {};

  if (state.pricing) {
    const p = state.pricing;
    patch.booking_rate = p.booking_rate;
    patch.down_payment = p.down_payment;
    patch.security_deposit = p.security_deposit;
    patch.pet_fee = booking.has_pets ? p.pet_fee : 0;
    patch.parking_rate_guest = booking.need_parking ? p.parking_rate_guest : 0;
    patch.guest_additional_fee = p.guest_additional_fee ?? 0;
  }

  if (booking.need_parking && state.parking) {
    patch.parking_owner = state.parking.parking_owner.trim() || null;
    patch.parking_rate_paid = state.parking.parking_rate_paid;
    patch.parking_endorsement_url =
      state.parking.parking_endorsement_url || null;
    patch.parking_fee_included_in_downpayment =
      state.parking.parking_fee_included_in_downpayment;
    patch.parking_payment_receipt_url =
      state.parking.parking_fee_included_in_downpayment
        ? null
        : state.parking.parking_payment_receipt_url || null;
  }

  if (state.guestBalance) {
    patch.guest_balance_paid_amount =
      state.guestBalance.guest_balance_paid_amount;
    patch.guest_balance_payment_receipt_url =
      state.guestBalance.guest_balance_payment_receipt_url || null;
  }

  if (state.sdRefundGuest) {
    Object.assign(patch, guestSdRefundPayloadFromValues(state.sdRefundGuest));
  }

  if (state.sdSettlement) {
    const sd = state.sdSettlement;
    patch.sd_additional_expense_items = sd.sd_additional_expense_items;
    patch.sd_additional_profit_items = sd.sd_additional_profit_items;
    patch.sd_additional_expenses = sd.sd_additional_expense_items.map(
      (r) => Number(r.amount) || 0,
    );
    patch.sd_additional_profits = sd.sd_additional_profit_items.map(
      (r) => Number(r.amount) || 0,
    );
    patch.sd_refund_amount = sd.sd_refund_amount;
    patch.sd_refund_receipt_url = sd.sd_refund_receipt_url || null;
  }

  return patch;
}
