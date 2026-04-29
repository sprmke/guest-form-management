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

import { useEffect } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';

const schema = z.object({
  booking_rate: z.coerce.number().positive('Enter a positive rate'),
  down_payment: z.coerce.number().min(0, 'Must be ≥ 0'),
  security_deposit: z.coerce.number().min(0, 'Must be ≥ 0').default(1500),
  pet_fee: z.coerce.number().min(0).optional(),
  parking_rate_guest: z.coerce.number().min(0).optional(),
  guest_additional_fee: z.coerce.number().min(0).optional(),
});

export type ReviewPricingValues = z.infer<typeof schema>;

type Props = {
  booking: BookingRow;
  /** Last valid values from this session when the sub-form unmounts (e.g. pipeline step change). */
  initialDraft?: ReviewPricingValues | null;
  onChange: (values: ReviewPricingValues | null) => void;
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
  const computedDefaultRate = computeDefaultBookingRate(booking);

  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
    trigger,
  } = useForm<ReviewPricingValues>({
    resolver: zodResolver(schema),
    defaultValues: buildPricingDefaultValues(
      booking,
      computedDefaultRate,
      initialDraft,
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
      onChange(getValues());
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
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">
        Pricing
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Booking Rate" error={errors.booking_rate?.message}>
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

        <Field label="Down Payment" error={errors.down_payment?.message}>
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
            placeholder="300"
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
            placeholder="400"
            className={inputClass(!!errors.parking_rate_guest)}
            {...register('parking_rate_guest')}
          />
        </Field>

        <Field
          label="Additional fee"
          helpText="Early check-in, late check-out, surprise decor, etc."
          error={errors.guest_additional_fee?.message}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0"
            className={inputClass(!!errors.guest_additional_fee)}
            {...register('guest_additional_fee')}
          />
        </Field>
      </div>

      {/* Total guest balance display */}
      <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg ring-1 bg-slate-50 ring-slate-200">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-slate-700">
            Total Guest Balance
          </span>
          <span className="pl-5.5 text-[11px] leading-tight text-slate-500">
            (paid on or before check-in)
          </span>
        </span>
        <span
          className={`text-xl font-extrabold tracking-tight ${totalGuestBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}
        >
          {formatMoney(totalGuestBalance)}
        </span>
      </div>
    </div>
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
  helpText,
  error,
  children,
}: {
  label: string;
  /** Shown below the input, muted (not part of the label). */
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-600">{label}</label>
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
  initialDraft: ReviewPricingValues | null | undefined,
): DefaultValues<ReviewPricingValues> {
  const fromBooking: DefaultValues<ReviewPricingValues> = {
    booking_rate:
      toNullableNumber(booking.booking_rate) ??
      computedDefaultRate ??
      undefined,
    down_payment:
      toNullableNumber(booking.down_payment) ?? DEFAULT_DOWN_PAYMENT,
    security_deposit:
      toNullableNumber(booking.security_deposit) ?? DEFAULT_SECURITY_DEPOSIT,
    pet_fee: toNullableNumber(booking.pet_fee) ?? DEFAULT_PET_FEE,
    parking_rate_guest:
      toNullableNumber(booking.parking_rate_guest) ?? DEFAULT_PARKING_FEE,
    guest_additional_fee: toNullableNumber(booking.guest_additional_fee) ?? 0,
  };
  if (!initialDraft) return fromBooking;
  return {
    ...fromBooking,
    ...initialDraft,
  } satisfies DefaultValues<ReviewPricingValues>;
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
