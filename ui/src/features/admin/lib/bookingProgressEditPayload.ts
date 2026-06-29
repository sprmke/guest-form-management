/**
 * Progress-form values for BookingEditForm saves.
 */

import type { GuestBalanceSettlementValues } from "@/features/admin/components/GuestBalanceSettlementForm";
import type { ParkingRequestValues } from "@/features/admin/components/ParkingRequestForm";
import type { ReviewPricingFormValues } from "@/features/admin/components/ReviewPricingForm";
import type { SdRefundValues } from "@/features/admin/components/SdRefundForm";
import {
  guestSdRefundPayloadFromValues,
  type GuestSdRefundEditValues,
} from "@/features/admin/components/GuestSdRefundEditForm";
import type { UpdateBookingPayload } from "@/features/admin/hooks/useUpdateBooking";
import type { BookingRow } from "@/features/admin/lib/types";

export type ProgressFormEditState = {
  pricing: ReviewPricingFormValues | null;
  parking: ParkingRequestValues | null;
  guestBalance: GuestBalanceSettlementValues | null;
  sdRefundGuest: GuestSdRefundEditValues | null;
  sdSettlement: SdRefundValues | null;
};

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
    patch.parking_payment_receipt_url = state.parking
      .parking_fee_included_in_downpayment
      ? null
      : state.parking.parking_payment_receipt_url || null;
    if (
      !state.parking.parking_fee_included_in_downpayment &&
      !state.parking.parking_payment_receipt_url?.trim()
    ) {
      patch.parking_receipt_ai_verdict = null;
      patch.parking_receipt_ai_summary = null;
    }
  }

  if (state.guestBalance) {
    patch.guest_balance_paid_amount =
      state.guestBalance.guest_balance_paid_amount;
    patch.guest_balance_payment_receipt_url =
      state.guestBalance.guest_balance_payment_receipt_url || null;
    if (!state.guestBalance.guest_balance_payment_receipt_url?.trim()) {
      patch.balance_receipt_ai_verdict = null;
      patch.balance_receipt_ai_summary = null;
    }
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
