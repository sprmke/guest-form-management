/**
 * ReviewPricingForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_REVIEW → PENDING_GAF.
 *
 * Captures: booking_rate, down_payment, security_deposit, pet_fee (if pets).
 * Computes: balance = booking_rate - down_payment (read-only display).
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q2.1, Q2.3, Q2.4
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign } from 'lucide-react';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';

const schema = z.object({
  booking_rate: z.coerce.number().positive('Enter a positive rate'),
  down_payment: z.coerce.number().min(0, 'Must be ≥ 0'),
  security_deposit: z.coerce.number().min(0, 'Must be ≥ 0').default(1500),
  pet_fee: z.coerce.number().min(0).optional(),
});

export type ReviewPricingValues = z.infer<typeof schema>;

type Props = {
  booking: BookingRow;
  onChange: (values: ReviewPricingValues | null) => void;
};

export function ReviewPricingForm({ booking, onChange }: Props) {
  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
    trigger,
  } = useForm<ReviewPricingValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      booking_rate: (booking.booking_rate as number) || undefined,
      down_payment: (booking.down_payment as number) || 0,
      security_deposit: (booking.security_deposit as number) || 1500,
      pet_fee: (booking.pet_fee as number) || undefined,
    },
    mode: 'onChange',
  });

  const bookingRate = watch('booking_rate') ?? 0;
  const downPayment = watch('down_payment') ?? 0;
  const balance = (bookingRate || 0) - (downPayment || 0);

  useEffect(() => {
    if (isValid) {
      onChange(getValues());
    } else {
      onChange(null);
    }
  }, [
    bookingRate,
    downPayment,
    watch('security_deposit'),
    watch('pet_fee'),
    isValid,
  ]);

  const hasPets = !!booking.has_pets;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">
        Pricing
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Booking Rate (₱)" error={errors.booking_rate?.message}>
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

        <Field label="Down Payment (₱)" error={errors.down_payment?.message}>
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
          label="Security Deposit (₱)"
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

        {hasPets && (
          <Field label="Pet Fee (₱)" error={errors.pet_fee?.message}>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="500"
              className={inputClass(!!errors.pet_fee)}
              {...register('pet_fee')}
            />
          </Field>
        )}
      </div>

      {/* Balance display */}
      <div className="flex justify-between items-center px-3 py-2 rounded-lg ring-1 bg-slate-50 ring-slate-200">
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <DollarSign className="size-3.5" />
          Balance (rate − down payment)
        </span>
        <span
          className={`text-sm font-semibold ${balance < 0 ? 'text-red-600' : 'text-slate-900'}`}
        >
          {formatMoney(balance)}
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
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-600">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
