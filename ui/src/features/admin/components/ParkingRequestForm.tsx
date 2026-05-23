/**
 * ParkingRequestForm — Sub-form shown in WorkflowPanel when transitioning
 * from PENDING_PARKING_REQUEST → PENDING_PET_REQUEST | READY_FOR_CHECKIN.
 *
 * Captures: parking_owner (owner/agent name), parking_rate_paid (Paid Parking Rate),
 * and parking_endorsement_url. Displays read-only `parking_rate_guest` (Parking Rate).
 * Parking endorsement is uploaded directly from this form.
 *
 * Plan: docs/NEW_FLOW_PLAN.md §6.1 Q4.4, Q4.5
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requiredPositiveMoney } from '@/features/admin/lib/moneyFieldSchema';
import { ExternalLink, FileImage, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';
import { useUploadBookingAsset } from '@/features/admin/hooks/useUploadBookingAsset';
import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';
import { cn } from '@/lib/utils';

export const parkingRequestFormSchema = z.object({
  parking_owner: z.string().trim().min(1, 'Enter parking owner or agent name'),
  parking_rate_paid: requiredPositiveMoney({
    requiredError: 'Enter paid parking rate',
    positiveError: 'Enter a rate greater than 0',
  }),
  parking_endorsement_url: z
    .string()
    .url('Please upload a parking endorsement image'),
});

export type ParkingRequestValues = z.infer<typeof parkingRequestFormSchema>;

/** Use for CTAs (e.g. Mark as Complete) so they stay in sync with form validation. */
export function isParkingRequestDraftComplete(
  values: ParkingRequestValues | null,
): boolean {
  if (values == null) return false;
  return parkingRequestFormSchema.safeParse(values).success;
}

type Props = {
  booking: BookingRow;
  initialDraft?: ParkingRequestValues | null;
  onChange: (values: ParkingRequestValues | null) => void;
};

export function ParkingRequestForm({
  booking,
  initialDraft = null,
  onChange,
}: Props) {
  const uploadMut = useUploadBookingAsset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentEndorsementUrl, setCurrentEndorsementUrl] = useState(() => {
    if (initialDraft?.parking_endorsement_url)
      return initialDraft.parking_endorsement_url;
    return booking.parking_endorsement_url ?? '';
  });

  const {
    register,
    watch,
    formState: { errors, isValid },
    getValues,
    setValue,
  } = useForm<ParkingRequestValues>({
    resolver: zodResolver(parkingRequestFormSchema),
    defaultValues: {
      parking_owner:
        initialDraft?.parking_owner?.trim() ??
        String(booking.parking_owner ?? '').trim(),
      parking_rate_paid:
        initialDraft?.parking_rate_paid ??
        ((booking.parking_rate_paid as number) || undefined),
      parking_endorsement_url:
        initialDraft?.parking_endorsement_url ??
        booking.parking_endorsement_url ??
        '',
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
    <WorkflowSubFormCard title="Parking request">
      <div className="px-3 py-2 text-xs text-amber-800 bg-amber-50 rounded-md ring-1 ring-amber-200">
        Parking fee is <strong>non-refundable</strong> and cannot be rescheduled
        after this step.
      </div>

      <Field
        label="Parking Owner"
        required
        description="Parking owner facebook name"
        error={errors.parking_owner?.message}
      >
        <input
          type="text"
          autoComplete="off"
          placeholder="Juan Dela Cruz"
          className={inputClass(!!errors.parking_owner)}
          {...register('parking_owner')}
        />
      </Field>

      <Field
        label="Parking Rate"
        description="Exact parking amount guest paid"
      >
        <input
          type="text"
          readOnly
          tabIndex={-1}
          value={formatMoney(booking.parking_rate_guest)}
          className={readOnlyInputClass()}
          aria-readonly="true"
        />
      </Field>

      <Field
        label="Paid Parking Rate"
        required
        description="Exact parking amount paid to parking owner"
        error={errors.parking_rate_paid?.message}
      >
        <input
          type="number"
          min={1}
          step={10}
          placeholder="400"
          className={inputClass(!!errors.parking_rate_paid)}
          {...register('parking_rate_paid')}
        />
      </Field>

      <Field
        label="Parking Endorsement"
        required
        error={errors.parking_endorsement_url?.message}
      >
        <input type="hidden" {...register('parking_endorsement_url')} />
        <div className="space-y-2">
          {currentEndorsementUrl ? (
            <a
              href={currentEndorsementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 items-center p-2 bg-white rounded-lg border transition-colors group border-slate-200 hover:border-blue-300"
            >
              <div className="overflow-hidden w-12 h-12 rounded-md shrink-0 bg-slate-100">
                <img
                  src={currentEndorsementUrl}
                  alt="Parking endorsement"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
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
            <div className="flex justify-center items-center h-14 text-xs bg-white rounded-lg border border-dashed border-slate-300 text-slate-500">
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
    </WorkflowSubFormCard>
  );
}

function inputClass(hasError: boolean) {
  return [
    'h-10 w-full rounded-md border px-3 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
  ].join(' ');
}

function readOnlyInputClass() {
  return [
    'h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700',
    'cursor-default focus:outline-none',
  ].join(' ');
}

function Field({
  label,
  required,
  description,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
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
      {description && (
        <p className="text-[10px] text-slate-500 -mt-0.5">{description}</p>
      )}
      {children}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
