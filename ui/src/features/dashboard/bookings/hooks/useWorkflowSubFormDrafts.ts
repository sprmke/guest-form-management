/**
 * WorkflowPanel sub-form draft state — pure relocation from the pre-decomposition
 * `WorkflowPanel.tsx` (the 5 `useState`s + `buildPayload`/`isTransitionDisabled`).
 * No new logic: same `lib/workflow.ts#requiredSubForm` call, same field mapping.
 */

import { useCallback, useEffect, useState } from 'react';

import type { GuestBalanceSettlementValues } from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import {
  isParkingRequestDraftComplete,
  type ParkingRequestValues,
} from '@/features/dashboard/bookings/components/ParkingRequestForm';
import type { ReviewPricingFormValues } from '@/features/dashboard/bookings/components/ReviewPricingForm';
import type { SdRefundValues } from '@/features/dashboard/bookings/components/SdRefundForm';
import type { TransitionPayload } from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { requiredSubForm } from '@/features/dashboard/bookings/lib/workflow';

export function useWorkflowSubFormDrafts(booking: BookingRow, status: BookingStatus) {
  const [pricingValues, setPricingValues] = useState<ReviewPricingFormValues | null>(null);
  const [surpriseDecorStaffAck, setSurpriseDecorStaffAck] = useState(
    () => !!booking.surprise_decor_staff_acknowledged
  );

  useEffect(() => {
    setSurpriseDecorStaffAck(!!booking.surprise_decor_staff_acknowledged);
  }, [booking.id, booking.surprise_decor_staff_acknowledged]);

  const [parkingValues, setParkingValues] = useState<ParkingRequestValues | null>(null);
  const [sdRefundValues, setSdRefundValues] = useState<SdRefundValues | null>(null);
  const [guestBalanceValues, setGuestBalanceValues] = useState<GuestBalanceSettlementValues | null>(
    null
  );

  const buildPayload = useCallback(
    (toStatus: BookingStatus): TransitionPayload => {
      const subForm = requiredSubForm(status, toStatus);
      if (subForm === 'pricing' && pricingValues) {
        const base = {
          booking_rate: pricingValues.booking_rate,
          down_payment: pricingValues.down_payment,
          security_deposit: pricingValues.security_deposit,
          pet_fee: booking.has_pets === true ? pricingValues.pet_fee : 0,
          parking_rate_guest: booking.need_parking === true ? pricingValues.parking_rate_guest : 0,
          guest_additional_fee: pricingValues.guest_additional_fee,
        };
        if (booking.guest_requests_surprise_decor && surpriseDecorStaffAck) {
          return {
            ...base,
            surprise_decor_staff_acknowledged: true,
          };
        }
        return base;
      }
      if (subForm === 'parking' && parkingValues) {
        return {
          parking_owner: parkingValues.parking_owner.trim() || null,
          parking_rate_paid: parkingValues.parking_rate_paid,
          parking_endorsement_url: parkingValues.parking_endorsement_url || null,
          parking_fee_included_in_downpayment: parkingValues.parking_fee_included_in_downpayment,
          parking_payment_receipt_url: parkingValues.parking_fee_included_in_downpayment
            ? null
            : parkingValues.parking_payment_receipt_url || null,
        };
      }
      if (subForm === 'sd_refund' && sdRefundValues) {
        return {
          sd_additional_expenses: sdRefundValues.sd_additional_expense_items.map(
            (r) => Number(r.amount) || 0
          ),
          sd_additional_profits: sdRefundValues.sd_additional_profit_items.map(
            (r) => Number(r.amount) || 0
          ),
          sd_refund_amount: sdRefundValues.sd_refund_amount,
          sd_refund_receipt_url: sdRefundValues.sd_refund_receipt_url || null,
        };
      }
      if (subForm === 'guest_balance' && guestBalanceValues) {
        return {
          guest_balance_paid_amount: guestBalanceValues.guest_balance_paid_amount,
          guest_balance_payment_receipt_url:
            guestBalanceValues.guest_balance_payment_receipt_url || null,
        };
      }
      return {};
    },
    [
      status,
      pricingValues,
      booking.has_pets,
      booking.need_parking,
      booking.guest_requests_surprise_decor,
      surpriseDecorStaffAck,
      parkingValues,
      sdRefundValues,
      guestBalanceValues,
    ]
  );

  const isTransitionDisabled = useCallback(
    (toStatus: BookingStatus): boolean => {
      const subForm = requiredSubForm(status, toStatus);
      if (subForm === 'pricing') {
        if (pricingValues === null) return true;
        if (booking.guest_requests_surprise_decor && !surpriseDecorStaffAck) {
          return true;
        }
        return false;
      }
      if (subForm === 'parking') return !isParkingRequestDraftComplete(parkingValues);
      if (subForm === 'sd_refund') return sdRefundValues === null;
      if (subForm === 'guest_balance') return guestBalanceValues === null;
      return false;
    },
    [
      status,
      pricingValues,
      booking.guest_requests_surprise_decor,
      surpriseDecorStaffAck,
      parkingValues,
      sdRefundValues,
      guestBalanceValues,
    ]
  );

  return {
    pricingValues,
    setPricingValues,
    surpriseDecorStaffAck,
    setSurpriseDecorStaffAck,
    parkingValues,
    setParkingValues,
    sdRefundValues,
    setSdRefundValues,
    guestBalanceValues,
    setGuestBalanceValues,
    buildPayload,
    isTransitionDisabled,
  };
}

export type WorkflowSubFormDrafts = ReturnType<typeof useWorkflowSubFormDrafts>;
