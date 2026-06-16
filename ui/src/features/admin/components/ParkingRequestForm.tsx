/**
 * ParkingRequestForm — Sub-form shown in WorkflowPanel when transitioning
 * from PENDING_PARKING_REQUEST → PENDING_PET_REQUEST | READY_FOR_CHECKIN.
 *
 * Captures: parking_owner (owner/agent name), parking_rate_paid (Owner Parking Rate),
 * parking_endorsement_url, and whether the guest parking fee was included in the
 * downpayment receipt or paid separately (with receipt upload).
 * Displays read-only `parking_rate_guest` (Parking Rate).
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
import {
  WorkflowFormShell,
  workflowFormEditTitle,
  type WorkflowFormVariant,
} from '@/features/admin/components/WorkflowFormShell';
import {
  workflowAssetPreviewCard,
  workflowAssetViewLink,
  workflowUploadButtonClass,
} from '@/features/admin/lib/workflowActionButtonStyles';
import { isPostPendingDocumentsStatus } from '@/features/admin/lib/workflow';

export const parkingRequestFormSchema = z
  .object({
    parking_owner: z.string().trim().min(1, 'Enter parking owner or agent name'),
    parking_rate_paid: requiredPositiveMoney({
      requiredError: 'Enter owner parking rate',
      positiveError: 'Enter a rate greater than 0',
    }),
    parking_endorsement_url: z
      .string()
      .url('Please upload a parking endorsement image'),
    parking_fee_included_in_downpayment: z.boolean(),
    parking_payment_receipt_url: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.parking_fee_included_in_downpayment) return;
    const url = data.parking_payment_receipt_url.trim();
    if (!url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parking_payment_receipt_url'],
        message: 'Upload a parking payment receipt',
      });
      return;
    }
    try {
      z.string().url().parse(url);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parking_payment_receipt_url'],
        message: 'Upload a valid parking payment receipt',
      });
    }
  });

export type ParkingRequestValues = z.infer<typeof parkingRequestFormSchema>;

/** Default / restore “included in downpayment” from status and saved parking cycle. */
export function resolveParkingFeeIncludedDefault(
  booking: Pick<
    BookingRow,
    'status' | 'parking_completed_at' | 'parking_fee_included_in_downpayment'
  >,
  initialDraft?: Pick<
    ParkingRequestValues,
    'parking_fee_included_in_downpayment'
  > | null,
): boolean {
  if (initialDraft?.parking_fee_included_in_downpayment !== undefined) {
    return initialDraft.parking_fee_included_in_downpayment;
  }
  if (booking.parking_completed_at) {
    return booking.parking_fee_included_in_downpayment !== false;
  }
  return !isPostPendingDocumentsStatus(String(booking.status ?? ''));
}

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
  editMode?: boolean;
  variant?: WorkflowFormVariant;
};

export function ParkingRequestForm({
  booking,
  initialDraft = null,
  onChange,
  readOnly = false,
  editMode = false,
  variant = 'workflow',
}: Props) {
  const uploadMut = useUploadBookingAsset();
  const endorsementInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [currentEndorsementUrl, setCurrentEndorsementUrl] = useState(() => {
    if (initialDraft?.parking_endorsement_url)
      return initialDraft.parking_endorsement_url;
    return booking.parking_endorsement_url ?? '';
  });
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState(() => {
    if (initialDraft?.parking_payment_receipt_url)
      return initialDraft.parking_payment_receipt_url;
    return booking.parking_payment_receipt_url ?? '';
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
      parking_fee_included_in_downpayment: resolveParkingFeeIncludedDefault(
        booking,
        initialDraft,
      ),
      parking_payment_receipt_url:
        initialDraft?.parking_payment_receipt_url ??
        booking.parking_payment_receipt_url ??
        '',
    },
    mode: 'onChange',
  });

  const watched = watch();
  const includedInDownpayment = watch('parking_fee_included_in_downpayment');

  useEffect(() => {
    if (readOnly) return;
    if (editMode || isValid) {
      onChange(getValues());
    } else {
      onChange(null);
    }
  }, [JSON.stringify(watched), isValid, readOnly, editMode]);

  async function handleEndorsementFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
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
      if (endorsementInputRef.current) endorsementInputRef.current.value = '';
    }
  }

  async function handleReceiptFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'parking_payment_receipt',
        file,
      });
      setCurrentReceiptUrl(result.url);
      setValue('parking_payment_receipt_url', result.url, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success('Parking payment receipt uploaded');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to upload parking payment receipt',
      );
    } finally {
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  }

  const cardTitle =
    variant === 'edit'
      ? workflowFormEditTitle('Parking request')
      : 'Parking request';

  return (
    <WorkflowFormShell title={cardTitle} variant={variant}>
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
                ref={endorsementInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEndorsementFileChange}
                disabled={uploadMut.isPending}
              />
              <button
                type="button"
                disabled={uploadMut.isPending}
                onClick={() => endorsementInputRef.current?.click()}
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


      {!readOnly ? (
        <div className="space-y-1">
          <label className="-mx-1 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-1 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={includedInDownpayment}
              className="mt-1 size-4 shrink-0 rounded border-border text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-border/60"
              onChange={(e) => {
                const checked = e.target.checked;
                setValue('parking_fee_included_in_downpayment', checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                if (checked) {
                  setValue('parking_payment_receipt_url', '', {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setCurrentReceiptUrl('');
                }
              }}
            />
            <span className="text-xs leading-snug text-muted-foreground">
              Parking fee is included from downpayment receipt
            </span>
          </label>
        </div>
      ) : (
        <Field label="Parking fee payment">
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={
              includedInDownpayment
                ? 'Included in downpayment receipt'
                : 'Separate payment (receipt on file)'
            }
            className={readOnlyInputClass()}
            aria-readonly="true"
          />
        </Field>
      )}

      {!includedInDownpayment ? (
        <Field
          label="Parking Payment Receipt"
          required
          error={errors.parking_payment_receipt_url?.message}
        >
          <input type="hidden" {...register('parking_payment_receipt_url')} />
          <div className="space-y-2">
            {currentReceiptUrl ? (
              <a
                href={currentReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={workflowAssetPreviewCard}
              >
                <div className="overflow-hidden w-12 h-12 rounded-md shrink-0 bg-muted">
                  <img
                    src={currentReceiptUrl}
                    alt="Parking payment receipt"
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Current receipt
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
                  No parking payment receipt uploaded
                </span>
              </div>
            )}

            {!readOnly ? (
              <>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptFileChange}
                  disabled={uploadMut.isPending}
                />
                <button
                  type="button"
                  disabled={uploadMut.isPending}
                  onClick={() => receiptInputRef.current?.click()}
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
                      {currentReceiptUrl
                        ? 'Replace parking payment receipt'
                        : 'Upload parking payment receipt'}
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </Field>
      ) : null}

    </WorkflowFormShell>
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
