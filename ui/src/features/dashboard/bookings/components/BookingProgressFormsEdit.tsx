/**
 * Progress workflow forms embedded in BookingEditForm — editable at any status.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  GuestBalanceSettlementForm,
  type GuestBalanceSettlementValues,
} from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import {
  GuestSdRefundEditForm,
  type GuestSdRefundEditValues,
} from '@/features/dashboard/bookings/components/GuestSdRefundEditForm';
import {
  ParkingRequestForm,
  type ParkingRequestValues,
} from '@/features/dashboard/bookings/components/ParkingRequestForm';
import {
  ReviewPricingForm,
  type ReviewPricingFormValues,
} from '@/features/dashboard/bookings/components/ReviewPricingForm';
import {
  SdRefundForm,
  type SdRefundValues,
} from '@/features/dashboard/bookings/components/SdRefundForm';
import {
  mergePricingIntoBooking,
  type ProgressFormEditState,
} from '@/features/dashboard/bookings/lib/bookingProgressEditPayload';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { isProgressEditFormEnabled } from '@/features/dashboard/bookings/lib/workflow';
import { usePropertyPricingDefaults } from '@/features/dashboard/pricing/hooks/usePropertyPricing';

type Props = {
  booking: BookingRow;
  onStateChange: (state: ProgressFormEditState) => void;
  onTouchedChange?: (touched: boolean) => void;
};

export function BookingProgressFormsEdit({ booking, onStateChange, onTouchedChange }: Props) {
  const {
    defaults: propertyPricingDefaults,
    data: propertyPricingData,
    isFetched: propertyPricingLoaded,
  } = usePropertyPricingDefaults();
  const hydrationDone = useRef(false);
  const [progressTouched, setProgressTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      hydrationDone.current = true;
    }, 400);
    return () => clearTimeout(t);
  }, [booking.id]);

  useEffect(() => {
    onTouchedChange?.(progressTouched);
  }, [progressTouched, onTouchedChange]);

  const markTouched = () => {
    if (hydrationDone.current) setProgressTouched(true);
  };
  const [pricing, setPricing] = useState<ReviewPricingFormValues | null>(null);
  const [parking, setParking] = useState<ParkingRequestValues | null>(null);
  const [guestBalance, setGuestBalance] = useState<GuestBalanceSettlementValues | null>(null);
  const [sdRefundGuest, setSdRefundGuest] = useState<GuestSdRefundEditValues | null>(null);
  const [sdSettlement, setSdSettlement] = useState<SdRefundValues | null>(null);

  const bookingForBalance = useMemo(
    () => mergePricingIntoBooking(booking, pricing),
    [booking, pricing]
  );

  const showPricing = isProgressEditFormEnabled(booking, 'pricing');
  const showParking = !!booking.need_parking && isProgressEditFormEnabled(booking, 'parking');
  const showGuestBalance = isProgressEditFormEnabled(booking, 'guest_balance');
  const showSdRefundGuest = isProgressEditFormEnabled(booking, 'sd_refund_guest');
  const showSdSettlement = isProgressEditFormEnabled(booking, 'sd_settlement');

  const emit = (next: Partial<ProgressFormEditState> = {}) => {
    const state: ProgressFormEditState = {
      pricing: showPricing ? (next.pricing !== undefined ? next.pricing : pricing) : null,
      parking: showParking ? (next.parking !== undefined ? next.parking : parking) : null,
      guestBalance: showGuestBalance
        ? next.guestBalance !== undefined
          ? next.guestBalance
          : guestBalance
        : null,
      sdRefundGuest: showSdRefundGuest
        ? next.sdRefundGuest !== undefined
          ? next.sdRefundGuest
          : sdRefundGuest
        : null,
      sdSettlement: showSdSettlement
        ? next.sdSettlement !== undefined
          ? next.sdSettlement
          : sdSettlement
        : null,
    };
    onStateChange(state);
  };

  useEffect(() => {
    emit();
  }, [
    booking.id,
    booking.status,
    showPricing,
    showParking,
    showGuestBalance,
    showSdRefundGuest,
    showSdSettlement,
  ]);

  return (
    <div className="space-y-3">
      {showPricing ? (
        <ReviewPricingForm
          key={`${booking.id}-edit-pricing-${propertyPricingLoaded ? 'loaded' : 'pending'}`}
          booking={booking}
          onChange={(values) => {
            setPricing(values);
            markTouched();
            emit({ pricing: values });
          }}
          editMode
          variant="edit"
          propertyDefaults={propertyPricingDefaults}
          dateOverrides={propertyPricingData?.dateOverrides}
          holidayRules={propertyPricingData?.holidayRules}
        />
      ) : null}

      {showParking ? (
        <ParkingRequestForm
          key={`${booking.id}-edit-parking`}
          booking={bookingForBalance}
          onChange={(values) => {
            setParking(values);
            markTouched();
            emit({ parking: values });
          }}
          editMode
          variant="edit"
        />
      ) : null}

      {showGuestBalance ? (
        <GuestBalanceSettlementForm
          key={`${booking.id}-edit-guest-balance`}
          booking={bookingForBalance}
          onChange={(values) => {
            setGuestBalance(values);
            markTouched();
            emit({ guestBalance: values });
          }}
          editMode
          variant="edit"
        />
      ) : null}

      {showSdRefundGuest ? (
        <GuestSdRefundEditForm
          key={`${booking.id}-edit-sd-refund-guest`}
          booking={booking}
          onChange={(values) => {
            setSdRefundGuest(values);
            markTouched();
            emit({ sdRefundGuest: values });
          }}
          editMode
        />
      ) : null}

      {showSdSettlement ? (
        <SdRefundForm
          key={`${booking.id}-edit-sd-settlement`}
          booking={bookingForBalance}
          onChange={(values) => {
            setSdSettlement(values);
            markTouched();
            emit({ sdSettlement: values });
          }}
          editMode
          variant="edit"
          showGuestDetails={false}
        />
      ) : null}
    </div>
  );
}
