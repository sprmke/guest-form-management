/**
 * ReviewPricingForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_REVIEW → PENDING_GAF.
 *
 * Captures: booking_rate, down_payment, security_deposit, pet_fee, parking_rate_guest,
 * guest_additional_fee.
 * Computes total guest balance (excludes parking — settled on Parking Request):
 * Facebook: booking_rate - down_payment + security_deposit + pet_fee + guest_additional_fee.
 * Airbnb: pet_fee + guest_additional_fee only (stay paid on Airbnb).
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q2.1, Q2.3, Q2.4
 */

import { useEffect, useMemo } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  WorkflowFormShell,
  workflowFormEditTitle,
  type WorkflowFormVariant,
} from '@/features/admin/components/WorkflowFormShell';
import { formatMoney } from '@/features/admin/lib/formatters';
import {
  computeTotalGuestBalance,
} from '@/features/admin/lib/totalGuestBalance';
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
  /** Read-only preview when browsing a completed pipeline step. */
  readOnly?: boolean;
  /** Booking edit form: always emit current values (skip strict validation gate). */
  editMode?: boolean;
  variant?: WorkflowFormVariant;
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
  readOnly = false,
  editMode = false,
  variant = 'workflow',
}: Props) {
  const isAirbnb = (booking.booking_source || 'Facebook') === 'Airbnb';
  const surpriseDecorRequested = !!booking.guest_requests_surprise_decor;
  const needParking = booking.need_parking === true;
  const hasPets = booking.has_pets === true;
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
  const petFee = hasPets ? (toNullableNumber(watch('pet_fee')) ?? 0) : 0;
  const additionalFee = toNullableNumber(watch('guest_additional_fee')) ?? 0;
  const totalGuestBalance =
    computeTotalGuestBalance({
      ...booking,
      booking_rate: bookingRate,
      down_payment: downPayment,
      security_deposit: securityDeposit,
      pet_fee: petFee,
      guest_additional_fee: additionalFee,
    }) ?? 0;

  useEffect(() => {
    if (readOnly) return;
    if (editMode || isValid) {
      onChange(getValues() as ReviewPricingFormValues);
    } else {
      onChange(null);
    }
  }, [
    readOnly,
    editMode,
    bookingRate,
    downPayment,
    securityDeposit,
    petFee,
    additionalFee,
    isValid,
  ]);

  const cardTitle =
    variant === 'edit'
      ? workflowFormEditTitle('Review pricing')
      : 'Review pricing';

  return (
    <WorkflowFormShell title={cardTitle} variant={variant}>
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
            className={inputClass(!!errors.booking_rate, false, readOnly)}
            readOnly={readOnly}
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
          helpText={isAirbnb ? 'Down payment is not required for Airbnb bookings' : undefined}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="1500"
            className={inputClass(!!errors.down_payment, false, isAirbnb || readOnly)}
            readOnly={isAirbnb || readOnly}
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
          helpText={isAirbnb ? 'Security deposit is not required for Airbnb bookings' : undefined}
        >
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="1500"
            className={inputClass(!!errors.security_deposit, false, isAirbnb || readOnly)}
            readOnly={isAirbnb || readOnly}
            {...register('security_deposit')}
          />
        </Field>

        <Field label="Pet Fee" error={errors.pet_fee?.message}>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={hasPets ? '300' : '0'}
            disabled={!hasPets || readOnly}
            readOnly={readOnly}
            className={inputClass(!!errors.pet_fee, !hasPets || readOnly, readOnly)}
            {...register('pet_fee')}
          />
        </Field>

        {needParking ? (
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
            className={inputClass(!!errors.parking_rate_guest, false, readOnly)}
            readOnly={readOnly}
            {...register('parking_rate_guest')}
          />
        </Field>
        ) : null}

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
            className={inputClass(!!errors.guest_additional_fee, false, readOnly)}
            readOnly={readOnly}
            {...register('guest_additional_fee')}
            onChange={async (e) => {
              register('guest_additional_fee').onChange(e);
              await trigger('guest_additional_fee');
            }}
          />
        </Field>
      </div>

      {/* Total guest balance display */}
      <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3.5 py-2.5 ring-1 ring-slate-200 dark:ring-border/60">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-foreground">
            Total Guest Balance
          </span>
          {isAirbnb ? (
            <span className="text-[10.5px] leading-snug text-muted-foreground">
              Booking rate is excluded for Airbnb bookings.
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 text-lg font-extrabold tracking-tight ${totalGuestBalance < 0 ? 'text-red-600' : 'text-foreground'}`}
        >
          {formatMoney(totalGuestBalance)}
        </span>
      </div>
    </WorkflowFormShell>
  );
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function inputClass(hasError: boolean, disabled = false, readOnly = false) {
  return [
    'w-full rounded-md border px-3 py-1.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
    disabled || readOnly
      ? 'cursor-not-allowed border-border bg-muted text-foreground'
      : hasError
        ? 'border-red-400 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
        : 'border-border bg-card',
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
      <label className="block text-xs text-muted-foreground">
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
        <p className="text-[10.5px] leading-snug text-muted-foreground">{helpText}</p>
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
    down_payment: isAirbnb
      ? 0
      : (toNullableNumber(booking.down_payment) ?? DEFAULT_DOWN_PAYMENT),
    security_deposit: isAirbnb
      ? 0
      : (toNullableNumber(booking.security_deposit) ?? DEFAULT_SECURITY_DEPOSIT),
    pet_fee: hasPets
      ? (toNullableNumber(booking.pet_fee) ?? DEFAULT_PET_FEE)
      : 0,
    parking_rate_guest: needParking
      ? (toNullableNumber(booking.parking_rate_guest) ?? DEFAULT_PARKING_FEE)
      : 0,
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
