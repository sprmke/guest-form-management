/**
 * ParkingRequestForm — Sub-form shown in WorkflowPanel when transitioning
 * from PENDING_PARKING_REQUEST → PENDING_PET_REQUEST | READY_FOR_CHECKIN.
 *
 * Captures: parking_rate_paid (Paid Parking Rate), parking_owner_email,
 *           parking_endorsement_url (uploaded separately via upload-booking-asset).
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q4.4, Q4.5
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BookingRow } from '@/features/admin/lib/types';

const schema = z.object({
  parking_rate_paid: z.coerce.number().min(0, 'Enter a rate ≥ 0'),
  parking_owner_email: z
    .string()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  parking_endorsement_url: z
    .string()
    .url('Enter a valid URL')
    .optional()
    .or(z.literal('')),
});

export type ParkingRequestValues = z.infer<typeof schema>;

type Props = {
  booking: BookingRow;
  onChange: (values: ParkingRequestValues | null) => void;
};

export function ParkingRequestForm({ booking, onChange }: Props) {
  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
  } = useForm<ParkingRequestValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      parking_rate_paid: (booking.parking_rate_paid as number) || undefined,
      parking_owner_email: (booking as any).parking_owner_email ?? '',
      parking_endorsement_url: (booking as any).parking_endorsement_url ?? '',
    },
    mode: 'onChange',
  });

  const watched = watch();

  useEffect(() => {
    if (isValid) {
      onChange(getValues());
    } else {
      onChange(null);
    }
  }, [JSON.stringify(watched), isValid]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Parking Details
      </p>

      <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
        Parking fee is <strong>non-refundable</strong> and bookings with parking
        cannot be rescheduled after this step.
      </div>

      <Field
        label="Paid Parking Rate (₱)"
        error={errors.parking_rate_paid?.message}
      >
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="300"
          className={inputClass(!!errors.parking_rate_paid)}
          {...register('parking_rate_paid')}
        />
      </Field>

      <Field
        label="Parking Owner Email"
        error={errors.parking_owner_email?.message}
      >
        <input
          type="email"
          placeholder="owner@example.com"
          className={inputClass(!!errors.parking_owner_email)}
          {...register('parking_owner_email')}
        />
      </Field>

      <Field
        label="Parking Endorsement URL"
        error={errors.parking_endorsement_url?.message}
      >
        <input
          type="url"
          placeholder="https://..."
          className={inputClass(!!errors.parking_endorsement_url)}
          {...register('parking_endorsement_url')}
        />
        <p className="text-[10px] text-slate-500 mt-0.5">
          Upload the endorsement image first via the asset uploader, then paste
          the URL here.
        </p>
      </Field>
    </div>
  );
}

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
