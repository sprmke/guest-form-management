/**
 * ParkingRequestForm — Sub-form shown in WorkflowPanel when transitioning
 * from PENDING_PARKING_REQUEST → PENDING_PET_REQUEST | READY_FOR_CHECKIN.
 *
 * Captures: parking_owner (owner/agent name), parking_rate_paid (Owner Parking Rate),
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
import {
  workflowAssetPreviewCard,
  workflowAssetViewLink,
  workflowUploadButtonClass,
} from '@/features/admin/lib/workflowActionButtonStyles';

export const parkingRequestFormSchema = z.object({
  parking_owner: z.string().trim().min(1, 'Enter parking owner or agent name'),
  parking_rate_paid: requiredPositiveMoney({
    requiredError: 'Enter owner parking rate',
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
  readOnly?: boolean;
};

export function ParkingRequestForm({
  booking,
  initialDraft = null,
  onChange,
  readOnly = false,
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
    if (readOnly) return;
    if (isValid) {
      onChange(getValues());
    } else {
      onChange(null);
    }
  }, [JSON.stringify(watched), isValid, readOnly]);

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
      {!readOnly ? (
      <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
        Parking fee is <strong>non-refundable</strong> and cannot be rescheduled
        after this step.
      </div>
      ) : null}

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
          className={inputClass(!!errors.parking_owner, readOnly)}
          readOnly={readOnly}
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
        label="Owner Parking Rate"
        required
        description="Exact parking amount paid to parking owner"
        error={errors.parking_rate_paid?.message}
      >
        <input
          type="number"
          min={1}
          step={10}
          placeholder="400"
          className={inputClass(!!errors.parking_rate_paid, readOnly)}
          readOnly={readOnly}
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
              className={workflowAssetPreviewCard}
            >
              <div className="overflow-hidden w-12 h-12 rounded-md shrink-0 bg-muted">
                <img
                  src={currentEndorsementUrl}
                  alt="Parking endorsement"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Current endorsement
                </p>
                <p className={workflowAssetViewLink}>
                  <ExternalLink className="size-3 shrink-0" />
                  View image
                </p>
              </div>
            </a>
          ) : (
            <div className="flex justify-center items-center h-14 text-xs bg-card rounded-lg border border-dashed border-border text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileImage className="size-3.5" />
                No parking endorsement uploaded
              </span>
            </div>
          )}

          {!readOnly ? (
          <>
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
            className={workflowUploadButtonClass(uploadMut.isPending)}
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
          </>
          ) : null}
        </div>
      </Field>
    </WorkflowSubFormCard>
  );
}

function inputClass(hasError: boolean, readOnly = false) {
  return [
    'h-10 w-full rounded-md border px-3 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
    readOnly
      ? 'cursor-default border-border bg-muted/50 text-foreground'
      : hasError
      ? 'border-red-400 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
      : 'border-border bg-card',
  ].join(' ');
}

function readOnlyInputClass() {
  return [
    'h-10 w-full rounded-md border border-border bg-muted/50 px-3 text-sm text-foreground',
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
      <label className="block text-xs text-muted-foreground">
        {label}
        {required ? (
          <>
            {' '}
            <span className="text-red-600">*</span>
          </>
        ) : null}
      </label>
      {description && (
        <p className="text-[10px] text-muted-foreground -mt-0.5">{description}</p>
      )}
      {children}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
