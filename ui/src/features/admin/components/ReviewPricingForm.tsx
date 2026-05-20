/**
 * ReviewPricingForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_REVIEW → PENDING_GAF.
 *
 * Captures: booking_rate, down_payment, security_deposit, pet_fee, parking_rate_guest,
 * guest_additional_fee.
 * Computes total guest balance:
 * booking_rate - down_payment + security_deposit + pet_fee + parking_rate_guest
 * + guest_additional_fee.
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q2.1, Q2.3, Q2.4
 */

import { useEffect, useMemo } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';
import { formatMoney } from '@/features/admin/lib/formatters';
import {
  optionalNonNegativeMoney,
  requiredNonNegativeMoney,
} from '@/features/admin/lib/moneyFieldSchema';
import type { BookingRow } from '@/features/admin/lib/types';

function createReviewPricingSchema(surpriseDecorRequested: boolean) {
  const guestAdditionalFeeSchema = surpriseDecorRequested
    ? requiredNonNegativeMoney({
        requiredError:
          'Additional fee is required when the guest requested surprise decor',
      })
    : optionalNonNegativeMoney();

  return z.object({
    booking_rate: requiredNonNegativeMoney({
      requiredError: 'Enter booking rate',
    }),
    down_payment: requiredNonNegativeMoney({
      requiredError: 'Enter down payment',
    }),
    security_deposit: requiredNonNegativeMoney({
      requiredError: 'Enter security deposit',
    }),
    pet_fee: optionalNonNegativeMoney(),
    parking_rate_guest: optionalNonNegativeMoney(),
    guest_additional_fee: guestAdditionalFeeSchema,
  });
}

export type ReviewPricingFormValues = z.infer<
  ReturnType<typeof createReviewPricingSchema>
>;

type Props = {
  booking: BookingRow;
  /** Last valid values from this session when the sub-form unmounts (e.g. pipeline step change). */
  initialDraft?: ReviewPricingFormValues | null;
  onChange: (values: ReviewPricingFormValues | null) => void;
};

const WEEKDAY_RATE = 2799;
const WEEKEND_RATE = 2999;
const DEFAULT_DOWN_PAYMENT = 1500;
const DEFAULT_SECURITY_DEPOSIT = 1500;
const DEFAULT_PET_FEE = 300;
const DEFAULT_PARKING_FEE = 400;

export function ReviewPricingForm({
  booking,
  initialDraft = null,
  onChange,
}: Props) {
  const surpriseDecorRequested = !!booking.guest_requests_surprise_decor;
  const schema = useMemo(
    () => createReviewPricingSchema(surpriseDecorRequested),
    [surpriseDecorRequested],
  );
  const computedDefaultRate = computeDefaultBookingRate(booking);

  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
    trigger,
  } = useForm<ReviewPricingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildPricingDefaultValues(
      booking,
      computedDefaultRate,
      initialDraft,
      surpriseDecorRequested,
    ),
    mode: 'onChange',
  });

  // `watch()` often yields strings from <input type="number"> — coerce before math
  // or `n + "700"` becomes string concat (e.g. 3499 + "700" → "3499700").
  const bookingRate = toNullableNumber(watch('booking_rate')) ?? 0;
  const downPayment = toNullableNumber(watch('down_payment')) ?? 0;
  const securityDeposit = toNullableNumber(watch('security_deposit')) ?? 0;
  const petFee = toNullableNumber(watch('pet_fee')) ?? 0;
  const parkingFee = toNullableNumber(watch('parking_rate_guest')) ?? 0;
  const additionalFee = toNullableNumber(watch('guest_additional_fee')) ?? 0;
  const totalGuestBalance =
    bookingRate -
    downPayment +
    securityDeposit +
    petFee +
    parkingFee +
    additionalFee;

  useEffect(() => {
    if (isValid) {
      onChange(getValues() as ReviewPricingFormValues);
    } else {
      onChange(null);
    }
  }, [
    bookingRate,
    downPayment,
    securityDeposit,
    petFee,
    parkingFee,
    additionalFee,
    isValid,
  ]);

  return (
    <WorkflowSubFormCard title="Review pricing">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Booking Rate"
          required
          error={errors.booking_rate?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="2799"
            className={inputClass(!!errors.booking_rate)}
            {...register('booking_rate')}
            onChange={async (e) => {
              register('booking_rate').onChange(e);
              await trigger();
            }}
          />
        </Field>

        <Field
          label="Down Payment"
          required
          error={errors.down_payment?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="1500"
            className={inputClass(!!errors.down_payment)}
            {...register('down_payment')}
            onChange={async (e) => {
              register('down_payment').onChange(e);
              await trigger();
            }}
          />
        </Field>

        <Field
          label="Security Deposit"
          required
          error={errors.security_deposit?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="1500"
            className={inputClass(!!errors.security_deposit)}
            {...register('security_deposit')}
          />
        </Field>

        <Field label="Pet Fee" error={errors.pet_fee?.message}>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={booking.has_pets === true ? '300' : '0'}
            className={inputClass(!!errors.pet_fee)}
            {...register('pet_fee')}
          />
        </Field>

        <Field
          label="Parking Fee"
          helpText="Amount charged to the guest for parking"
          error={errors.parking_rate_guest?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={booking.need_parking === true ? '400' : '0'}
            className={inputClass(!!errors.parking_rate_guest)}
            {...register('parking_rate_guest')}
          />
        </Field>

        <Field
          label="Additional fee"
          required={surpriseDecorRequested}
          helpText={
            surpriseDecorRequested
              ? 'Includes the surprise decor setup fee.'
              : 'Early check-in, late check-out, surprise decor, etc.'
          }
          error={errors.guest_additional_fee?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={surpriseDecorRequested ? '₱800-₱2000' : '0'}
            aria-required={surpriseDecorRequested}
            className={inputClass(!!errors.guest_additional_fee)}
            {...register('guest_additional_fee')}
            onChange={async (e) => {
              register('guest_additional_fee').onChange(e);
              await trigger('guest_additional_fee');
            }}
          />
        </Field>
      </div>

      {/* Total guest balance display */}
      <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg ring-1 bg-slate-50 ring-slate-200">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-slate-700">
            Total Guest Balance
          </span>
        </span>
        <span
          className={`text-xl font-extrabold tracking-tight ${totalGuestBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}
        >
          {formatMoney(totalGuestBalance)}
        </span>
      </div>
    </WorkflowSubFormCard>
  );
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-md border px-3 py-1.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
  ].join(' ');
}

function Field({
  label,
  required,
  helpText,
  error,
  children,
}: {
  label: string;
  /** Red asterisk (matches Guest balance settlement / workflow sidebar pattern). */
  required?: boolean;
  /** Shown below the input, muted (not part of the label). */
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-600">
        {label}
        {required ? (
          <>
            {' '}
            <span className="text-red-600">*</span>
          </>
        ) : null}
      </label>
      {children}
      {helpText && (
        <p className="text-[10.5px] leading-snug text-slate-500">{helpText}</p>
      )}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function buildPricingDefaultValues(
  booking: BookingRow,
  computedDefaultRate: number | null,
  initialDraft: ReviewPricingFormValues | null | undefined,
  surpriseDecorRequested: boolean,
): DefaultValues<ReviewPricingFormValues> {
  const isAirbnb = (booking.booking_source || 'Facebook') === 'Airbnb';
  const hasPets = booking.has_pets === true;
  const needParking = booking.need_parking === true;
  const storedAdditional = toNullableNumber(booking.guest_additional_fee);
  const defaultAdditional = surpriseDecorRequested
    ? (storedAdditional ?? undefined)
    : (storedAdditional ?? 0);
  const fromBooking: DefaultValues<ReviewPricingFormValues> = {
    booking_rate:
      toNullableNumber(booking.booking_rate) ??
      computedDefaultRate ??
      undefined,
    down_payment:
      toNullableNumber(booking.down_payment) ??
      (isAirbnb ? 0 : DEFAULT_DOWN_PAYMENT),
    security_deposit:
      toNullableNumber(booking.security_deposit) ??
      (isAirbnb ? 0 : DEFAULT_SECURITY_DEPOSIT),
    pet_fee:
      toNullableNumber(booking.pet_fee) ?? (hasPets ? DEFAULT_PET_FEE : 0),
    parking_rate_guest:
      toNullableNumber(booking.parking_rate_guest) ??
      (needParking ? DEFAULT_PARKING_FEE : 0),
    guest_additional_fee: defaultAdditional,
  };
  if (!initialDraft) return fromBooking;
  return {
    ...fromBooking,
    ...initialDraft,
  } satisfies DefaultValues<ReviewPricingFormValues>;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBookingDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const mdy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  return null;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function computeDefaultBookingRate(booking: BookingRow): number | null {
  const checkIn = parseBookingDate(booking.check_in_date);
  const checkOut = parseBookingDate(booking.check_out_date);

  if (checkIn && checkOut && checkOut > checkIn) {
    let total = 0;
    let cursor = new Date(checkIn);
    while (cursor < checkOut) {
      total += isWeekend(cursor) ? WEEKEND_RATE : WEEKDAY_RATE;
      cursor = addDays(cursor, 1);
    }
    return total;
  }

  const nights = Number(booking.number_of_nights ?? 0);
  if (Number.isFinite(nights) && nights > 0) {
    return nights * WEEKDAY_RATE;
  }

  return WEEKDAY_RATE;
}
