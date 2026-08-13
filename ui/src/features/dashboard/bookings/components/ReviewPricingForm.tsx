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
 * Plan: docs/planning/NEW_FLOW_PLAN.md §6.1 Q2.1, Q2.3, Q2.4
 */

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import {
  WorkflowFormShell,
  workflowFormEditTitle,
  type WorkflowFormVariant,
} from '@/features/dashboard/bookings/components/WorkflowFormShell';
import {
  optionalNonNegativeMoney,
  requiredNonNegativeMoney,
} from '@/features/dashboard/bookings/lib/moneyFieldSchema';
import { computeTotalGuestBalance } from '@/features/dashboard/bookings/lib/totalGuestBalance';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type { PricingHolidayRuleDto } from '@/features/dashboard/pricing/lib/phHolidayRules';
import {
  computeDefaultBookingRate,
  FALLBACK_PROPERTY_PRICING_DEFAULTS,
  type PropertyPricingDefaults,
} from '@/features/dashboard/pricing/lib/pricingCompute';

import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { formatMoney } from '@/utils/format/currency';

function createReviewPricingSchema(surpriseDecorRequested: boolean) {
  const guestAdditionalFeeSchema = surpriseDecorRequested
    ? requiredNonNegativeMoney({
        requiredError: 'Additional fee is required when the guest requested surprise decor',
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

export type ReviewPricingFormValues = z.infer<ReturnType<typeof createReviewPricingSchema>>;

type Props = {
  booking: BookingRow;
  /** Last valid values from this session when the sub-form unmounts (e.g. pipeline step change). */
  initialDraft?: ReviewPricingFormValues | null;
  onChange: (values: ReviewPricingFormValues | null) => void;
  /** Read-only preview when browsing a completed pipeline step. */
  readOnly?: boolean;
  /** Property defaults from Pricing page — falls back to legacy constants when omitted. */
  propertyDefaults?: PropertyPricingDefaults;
  /** Per-date nightly overrides from Pricing calendar. */
  dateOverrides?: Record<string, number>;
  /** Holiday / peak-season premiums from Pricing settings. */
  holidayRules?: PricingHolidayRuleDto[];
  /** Booking edit form: always emit current values (skip strict validation gate). */
  editMode?: boolean;
  variant?: WorkflowFormVariant;
};

export function ReviewPricingForm({
  booking,
  initialDraft = null,
  onChange,
  readOnly = false,
  propertyDefaults = FALLBACK_PROPERTY_PRICING_DEFAULTS,
  dateOverrides,
  holidayRules,
  editMode = false,
  variant = 'workflow',
}: Props) {
  const isAirbnb = (booking.booking_source || 'Direct') === 'Airbnb';
  const surpriseDecorRequested = !!booking.guest_requests_surprise_decor;
  const needParking = booking.need_parking === true;
  const hasPets = booking.has_pets === true;
  const schema = useMemo(
    () => createReviewPricingSchema(surpriseDecorRequested),
    [surpriseDecorRequested]
  );
  const computedDefaultRate = computeDefaultBookingRate(
    booking,
    propertyDefaults,
    dateOverrides,
    holidayRules
  );

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
      propertyDefaults
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

  const cardTitle = variant === 'edit' ? workflowFormEditTitle('Review pricing') : 'Review pricing';

  return (
    <WorkflowFormShell title={cardTitle} variant={variant} advanceMode="manual">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Booking Rate" required error={errors.booking_rate?.message}>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={FORM_PLACEHOLDERS.bookingRate}
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
            placeholder={FORM_PLACEHOLDERS.downPayment}
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
            placeholder={FORM_PLACEHOLDERS.securityDeposit}
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
            placeholder={hasPets ? String(propertyDefaults.petFee) : '0'}
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
              placeholder={FORM_PLACEHOLDERS.parkingRate}
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
      <div className="bg-muted/50 dark:ring-border/60 flex items-center justify-between rounded-lg px-3.5 py-2.5 ring-1 ring-slate-200">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground flex items-center gap-1.5 text-sm font-semibold leading-tight">
            Total Guest Balance
          </span>
          {isAirbnb ? (
            <span className="text-muted-foreground text-[10.5px] leading-snug">
              Booking rate is excluded for Airbnb bookings.
            </span>
          ) : null}
        </span>
        <span
          className={`text-md shrink-0 font-bold tracking-tight ${totalGuestBalance < 0 ? 'text-red-600' : 'text-foreground'}`}
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
    'field-focus',
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
      <label className="text-muted-foreground block text-xs">
        {label}
        {required ? (
          <>
            {' '}
            <span className="text-red-600">*</span>
          </>
        ) : null}
      </label>
      {children}
      {helpText && <p className="text-muted-foreground text-[10.5px] leading-snug">{helpText}</p>}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function buildPricingDefaultValues(
  booking: BookingRow,
  computedDefaultRate: number | null,
  initialDraft: ReviewPricingFormValues | null | undefined,
  surpriseDecorRequested: boolean,
  propertyDefaults: PropertyPricingDefaults
): DefaultValues<ReviewPricingFormValues> {
  const isAirbnb = (booking.booking_source || 'Direct') === 'Airbnb';
  const hasPets = booking.has_pets === true;
  const needParking = booking.need_parking === true;
  const storedAdditional = toNullableNumber(booking.guest_additional_fee);
  const defaultAdditional = surpriseDecorRequested
    ? (storedAdditional ?? undefined)
    : (storedAdditional ?? propertyDefaults.guestAdditionalFee);
  const fromBooking: DefaultValues<ReviewPricingFormValues> = {
    booking_rate: toNullableNumber(booking.booking_rate) ?? computedDefaultRate ?? undefined,
    down_payment: isAirbnb
      ? 0
      : (toNullableNumber(booking.down_payment) ?? propertyDefaults.downPayment),
    security_deposit: isAirbnb
      ? 0
      : (toNullableNumber(booking.security_deposit) ?? propertyDefaults.securityDeposit),
    pet_fee: hasPets ? (toNullableNumber(booking.pet_fee) ?? propertyDefaults.petFee) : 0,
    parking_rate_guest: needParking
      ? (toNullableNumber(booking.parking_rate_guest) ?? propertyDefaults.parkingRateGuest)
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
