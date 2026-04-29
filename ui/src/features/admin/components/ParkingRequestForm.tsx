/**
 * ParkingRequestForm — Sub-form shown in WorkflowPanel when transitioning
 * from PENDING_PARKING_REQUEST → PENDING_PET_REQUEST | READY_FOR_CHECKIN.
 *
 * Captures: parking_rate_paid (Paid Parking Rate) and parking_endorsement_url.
 * Parking endorsement is uploaded directly from this form.
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q4.4, Q4.5
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, FileImage, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingRow } from '@/features/admin/lib/types';
import { useUploadBookingAsset } from '@/features/admin/hooks/useUploadBookingAsset';
import { cn } from '@/lib/utils';

const requiredNumber = (fieldLabel: string) =>
  z.preprocess(
    (value) => {
      if (value == null) return undefined;
      if (typeof value === 'string' && value.trim() === '') return undefined;
      return Number(value);
    },
    z
      .number({
        required_error: `${fieldLabel} is required`,
        invalid_type_error: `${fieldLabel} must be a valid number`,
      })
      .min(0, `${fieldLabel} must be ≥ 0`),
  );

const schema = z.object({
  parking_rate_paid: requiredNumber('Paid Parking Rate'),
  parking_endorsement_url: z
    .string()
    .url('Please upload a parking endorsement image'),
});

export type ParkingRequestValues = z.infer<typeof schema>;

type Props = {
  booking: BookingRow;
  onChange: (values: ParkingRequestValues | null) => void;
};

export function ParkingRequestForm({ booking, onChange }: Props) {
  const uploadMut = useUploadBookingAsset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentEndorsementUrl, setCurrentEndorsementUrl] = useState(
    booking.parking_endorsement_url ?? '',
  );

  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
    setValue,
  } = useForm<ParkingRequestValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      parking_rate_paid: (booking.parking_rate_paid as number) || undefined,
      parking_endorsement_url: booking.parking_endorsement_url ?? '',
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'parking_endorsement',
        file,
      });
      setCurrentEndorsementUrl(result.url);
      setValue('parking_endorsement_url', result.url, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success('Parking endorsement uploaded');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to upload parking endorsement',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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
        description="Exact parking amount paid to parking owner"
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
        label="Parking Endorsement"
        error={errors.parking_endorsement_url?.message}
      >
        <input type="hidden" {...register('parking_endorsement_url')} />
        <div className="space-y-2">
          {currentEndorsementUrl ? (
            <a
              href={currentEndorsementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 hover:border-blue-300 transition-colors"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                <img
                  src={currentEndorsementUrl}
                  alt="Parking endorsement"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700">
                  Current endorsement
                </p>
                <p className="inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:underline">
                  <ExternalLink className="size-3 shrink-0" />
                  View image
                </p>
              </div>
            </a>
          ) : (
            <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <FileImage className="size-3.5" />
                No parking endorsement uploaded
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadMut.isPending}
          />
          <button
            type="button"
            disabled={uploadMut.isPending}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              uploadMut.isPending
                ? 'cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100',
            )}
          >
            {uploadMut.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading image...
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                {currentEndorsementUrl
                  ? 'Replace endorsement image'
                  : 'Upload endorsement image'}
              </>
            )}
          </button>
        </div>
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
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-600">{label}</label>
      {description && (
        <p className="text-[10px] text-slate-500 -mt-0.5">{description}</p>
      )}
      {children}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
