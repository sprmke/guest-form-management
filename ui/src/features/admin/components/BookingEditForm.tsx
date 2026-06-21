/**
 * BookingEditForm — inline edit form for all guest booking fields.
 *
 * Shown in the left column of BookingDetailPage when the admin clicks "Edit".
 * While the booking is in **Pending documents** (parent or GAF / parking / pet)
 * or **Ready for check-in**, saving **workflow-sensitive** guest/stay fields
 * reverts status to PENDING_REVIEW (see `hasWorkflowSensitiveGuestFieldDiff`
 * + docs/TODOS.md). Other edits keep status unchanged.
 *
 * Uses React Hook Form (no Zod for now — lightweight admin-only form).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { friendlyToastError } from '@/lib/toastMessages';
import {
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Save,
  Upload,
  X,
} from 'lucide-react';
import {
  CollapsibleGroup,
  Field,
  Input,
  Row2,
  Row3,
  Section,
  CheckboxOption,
  fieldControlClass,
} from '@/features/admin/components/bookingEditLayout';
import { BookingProgressFormsEdit } from '@/features/admin/components/BookingProgressFormsEdit';
import {
  progressFormPayloadFromState,
  type ProgressFormEditState,
} from '@/features/admin/lib/bookingProgressEditPayload';
import { cn } from '@/lib/utils';
import {
  useUpdateBooking,
  type UpdateBookingPayload,
} from '@/features/admin/hooks/useUpdateBooking';
import { hasWorkflowSensitiveGuestFieldDiff } from '@/features/admin/lib/workflowSensitiveGuestDiff';
import { shouldRevertGuestFieldEditsToPendingReview } from '@/features/admin/lib/bookingStatus';
import { ReadyForCheckinSensitiveFieldsNotice } from '@/features/admin/components/ReadyForCheckinSensitiveFieldsNotice';
import {
  useUploadBookingAsset,
  type GuestDocAssetType,
} from '@/features/admin/hooks/useUploadBookingAsset';
import { useClearBookingAsset } from '@/features/admin/hooks/useClearBookingAsset';
import { WorkflowAssetPreviewWithRemove } from '@/features/admin/components/WorkflowAssetPreviewWithRemove';
import {
  receiptAiUploadToastMessage,
  showDocumentAiModelErrorToast,
} from '@/features/admin/components/ReceiptAiVerdictBadge';
import type { BookingRow } from '@/features/admin/lib/types';
import { normalizeStoragePublicUrl } from '@/features/admin/lib/storageUrls';
import {
  BOOKING_SOURCE_OPTIONS,
  normalizeBookingSource,
} from '@/features/guest-form/lib/bookingSourceFromSearchParams';
import { NativeSelect } from '@/components/ui/native-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  createDisabledCheckoutDateMatcher,
  createDisabledDateMatcher,
  dateToString,
  getNextDay,
  normalizeDateString,
  stringToDate,
  DATE_PICKER_DISPLAY_FORMAT,
  type BookedDateRange,
} from '@/utils/dates';

const bookingEditDatePickerClass =
  'h-11 border-border/50 bg-muted/40 font-medium hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-ring/30';

type Props = {
  booking: BookingRow;
  onClose: () => void;
  onSaved: (updated: BookingRow) => void;
  /** Same handler as view-mode doc previews — opens in-page modal (resolved URL for private buckets). */
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
};

type FormValues = {
  booking_source: string;
  guest_facebook_name: string;
  primary_guest_name: string;
  guest_email: string;
  guest_phone_number: string;
  guest_address: string;
  nationality: string;
  guest2_name: string;
  guest3_name: string;
  guest4_name: string;
  guest5_name: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string;
  check_out_time: string;
  number_of_adults: number;
  number_of_children: number;
  number_of_nights: number;
  need_parking: boolean;
  car_plate_number: string;
  car_brand_model: string;
  car_color: string;
  has_pets: boolean;
  pet_name: string;
  pet_type: string;
  pet_breed: string;
  pet_age: string;
  pet_vaccination_date: string;
  find_us: string;
  find_us_details: string;
  guest_special_requests: string;
  guest_requests_surprise_decor: boolean;
};

function toStr(v: string | null | undefined) {
  return v ?? '';
}

function bookingEditPayloadFromValues(
  values: FormValues,
): UpdateBookingPayload {
  return {
    booking_source: normalizeBookingSource(values.booking_source),
    guest_facebook_name: values.guest_facebook_name,
    primary_guest_name: values.primary_guest_name,
    guest_email: values.guest_email,
    guest_phone_number: values.guest_phone_number,
    guest_address: values.guest_address || null,
    nationality: values.nationality || null,
    guest2_name: values.guest2_name || null,
    guest3_name: values.guest3_name || null,
    guest4_name: values.guest4_name || null,
    guest5_name: values.guest5_name || null,
    check_in_date: values.check_in_date,
    check_out_date: values.check_out_date,
    check_in_time: values.check_in_time || null,
    check_out_time: values.check_out_time || null,
    number_of_adults: Number(values.number_of_adults),
    number_of_children: Number(values.number_of_children) || null,
    number_of_nights: Number(values.number_of_nights),
    need_parking: values.need_parking,
    car_plate_number: values.need_parking
      ? values.car_plate_number || null
      : null,
    car_brand_model: values.need_parking
      ? values.car_brand_model || null
      : null,
    car_color: values.need_parking ? values.car_color || null : null,
    has_pets: values.has_pets,
    pet_name: values.has_pets ? values.pet_name || null : null,
    pet_type: values.has_pets ? values.pet_type || null : null,
    pet_breed: values.has_pets ? values.pet_breed || null : null,
    pet_age: values.has_pets ? values.pet_age || null : null,
    pet_vaccination_date: values.has_pets
      ? values.pet_vaccination_date || null
      : null,
    find_us: values.find_us || null,
    find_us_details: values.find_us_details || null,
    guest_special_requests: values.guest_special_requests || null,
    guest_requests_surprise_decor: values.guest_requests_surprise_decor,
  };
}

function toTimeInputValue(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';

  // Already HTML time input compatible.
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  // DB values may include seconds.
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);

  // Legacy 12-hour format like "2:00 PM".
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return '';
  const hour12 = Number(m[1]);
  const minute = m[2];
  const ampm = m[3].toUpperCase();
  let hour24 = hour12 % 12;
  if (ampm === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

export function BookingEditForm({
  booking,
  onClose,
  onSaved,
  onPreview,
}: Props) {
  const guestEditRevertPipeline = shouldRevertGuestFieldEditsToPendingReview(
    booking.status,
  );
  const updateMut = useUpdateBooking();
  const apiUrl = import.meta.env.VITE_API_URL;
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [progressFormState, setProgressFormState] =
    useState<ProgressFormEditState>({
      pricing: null,
      parking: null,
      guestBalance: null,
      sdSettlement: null,
      sdRefundGuest: null,
    });
  const [progressTouched, setProgressTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      booking_source: normalizeBookingSource(booking.booking_source),
      guest_facebook_name: toStr(booking.guest_facebook_name),
      primary_guest_name: toStr(booking.primary_guest_name),
      guest_email: toStr(booking.guest_email),
      guest_phone_number: toStr(booking.guest_phone_number),
      guest_address: toStr(booking.guest_address),
      nationality: toStr(booking.nationality),
      guest2_name: toStr(booking.guest2_name),
      guest3_name: toStr(booking.guest3_name),
      guest4_name: toStr(booking.guest4_name),
      guest5_name: toStr(booking.guest5_name),
      check_in_date: normalizeDateString(toStr(booking.check_in_date)),
      check_out_date: normalizeDateString(toStr(booking.check_out_date)),
      check_in_time: toTimeInputValue(booking.check_in_time),
      check_out_time: toTimeInputValue(booking.check_out_time),
      number_of_adults: booking.number_of_adults ?? 1,
      number_of_children: booking.number_of_children ?? 0,
      number_of_nights: booking.number_of_nights ?? 1,
      need_parking: booking.need_parking ?? false,
      car_plate_number: toStr(booking.car_plate_number),
      car_brand_model: toStr(booking.car_brand_model),
      car_color: toStr(booking.car_color),
      has_pets: booking.has_pets ?? false,
      pet_name: toStr(booking.pet_name),
      pet_type: toStr(booking.pet_type),
      pet_breed: toStr(booking.pet_breed),
      pet_age: toStr(booking.pet_age),
      pet_vaccination_date: normalizeDateString(
        toStr(booking.pet_vaccination_date),
      ),
      find_us: toStr(booking.find_us),
      find_us_details: toStr(booking.find_us_details),
      guest_special_requests: toStr(booking.guest_special_requests),
      guest_requests_surprise_decor: !!booking.guest_requests_surprise_decor,
    },
  });

  /** `useWatch` subscribes reliably; bare `watch()` here did not always re-render on edits. */
  const formSnapshot = useWatch({ control }) as FormValues;
  const watchParking = !!formSnapshot?.need_parking;
  const watchPets = !!formSnapshot?.has_pets;
  const watchSurpriseDecor = !!formSnapshot?.guest_requests_surprise_decor;
  const surpriseDecorChangedFromSaved =
    watchSurpriseDecor !== !!booking.guest_requests_surprise_decor;
  const watchCheckInDate = formSnapshot?.check_in_date ?? '';
  const showSensitiveRevertHint =
    guestEditRevertPipeline &&
    hasWorkflowSensitiveGuestFieldDiff(
      booking,
      bookingEditPayloadFromValues(formSnapshot),
    );
  const progressDirty = progressTouched;
  const canSave = isDirty || progressDirty;

  React.useEffect(() => {
    let mounted = true;
    const fetchBookedDates = async () => {
      try {
        const response = await fetch(`${apiUrl}/get-booked-dates`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        const result = await response.json();
        if (!mounted || !response.ok || !result?.success || !result?.data)
          return;
        const normalized = result.data.map((entry: BookedDateRange) => ({
          ...entry,
          checkInDate: normalizeDateString(entry.checkInDate),
          checkOutDate: normalizeDateString(entry.checkOutDate),
        }));
        setBookedDates(normalized);
      } catch (error) {
        console.error(
          'Failed to fetch booked dates for admin edit form:',
          error,
        );
      }
    };
    void fetchBookedDates();
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload = {
      ...bookingEditPayloadFromValues(values),
      ...(progressTouched
        ? progressFormPayloadFromState(booking, progressFormState)
        : {}),
    };

    const newSource = normalizeBookingSource(values.booking_source);
    const wasAirbnb = normalizeBookingSource(booking.booking_source) === 'Airbnb';
    const isNowAirbnb = newSource === 'Airbnb';
    if (isNowAirbnb) {
      payload.down_payment = 0;
      payload.security_deposit = 0;
      const rate =
        payload.booking_rate ??
        (booking.booking_rate != null ? Number(booking.booking_rate) : null);
      if (rate != null && !Number.isNaN(rate)) {
        payload.balance = Math.round(rate * 100) / 100;
      }
    }
    if (isNowAirbnb && !wasAirbnb) {
      payload.guest_balance_paid_amount = null;
      payload.guest_balance_payment_receipt_url = null;
      payload.balance_receipt_ai_verdict = null;
      payload.balance_receipt_ai_summary = null;
    }

    const revertToPendingReview =
      guestEditRevertPipeline &&
      hasWorkflowSensitiveGuestFieldDiff(booking, payload);

    try {
      const updated = await updateMut.mutateAsync({
        bookingId: booking.id,
        currentStatus: booking.status,
        payload,
        revertToPendingReview,
      });

      if (revertToPendingReview) {
        toast.success('Booking updated — moved to Pending Review');
      } else {
        toast.success('Booking updated');
      }
      onSaved(updated);
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Could not save booking'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <ReadyForCheckinSensitiveFieldsNotice visible={showSensitiveRevertHint} />

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md',
          'ring-1 ring-border/30 dark:ring-border/50',
        )}
      >
        <CollapsibleGroup
          id="booking-details"
          title="Guest Form Details"
          variant="nested"
          defaultOpen
        >
        {/* ── Guest Identity ─────────────────────────────────────────────────── */}
        <Section title="Guest Identity">
          <Row2>
            <Field label="Facebook / Airbnb Name" required>
              <Input {...register('guest_facebook_name', { required: true })} />
            </Field>
            <Field label="Primary Guest Name" required>
              <Input {...register('primary_guest_name', { required: true })} />
            </Field>
          </Row2>
          <Row2>
            <Field label="Email" required>
              <Input
                type="email"
                {...register('guest_email', { required: true })}
              />
            </Field>
            <Field label="Phone Number" required>
              <Input {...register('guest_phone_number', { required: true })} />
            </Field>
          </Row2>
          <Row2>
            <Field label="Address">
              <Input {...register('guest_address')} />
            </Field>
            <Field label="Nationality">
              <Input {...register('nationality')} />
            </Field>
          </Row2>
        </Section>

        {/* ── Additional Guests ─────────────────────────────────────────────── */}
        <Section title="Additional Guests">
          <Row2>
            <Field label="Guest 2">
              <Input
                {...register('guest2_name')}
                placeholder="Full name (optional)"
              />
            </Field>
            <Field label="Guest 3">
              <Input
                {...register('guest3_name')}
                placeholder="Full name (optional)"
              />
            </Field>
          </Row2>
          <Row2>
            <Field label="Guest 4">
              <Input
                {...register('guest4_name')}
                placeholder="Full name (optional)"
              />
            </Field>
            <Field label="Guest 5">
              <Input
                {...register('guest5_name')}
                placeholder="Full name (optional)"
              />
            </Field>
          </Row2>
        </Section>

        {/* ── Stay Details ──────────────────────────────────────────────────── */}
        <Section title="Stay Details">
          <Row2>
            <Field label="Check-in Date (MM-DD-YYYY)" required>
              <DatePicker
                date={
                  watchCheckInDate ? stringToDate(watchCheckInDate) : undefined
                }
                rangeEnd={
                  formSnapshot.check_out_date
                    ? stringToDate(formSnapshot.check_out_date)
                    : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  const selected = dateToString(date);
                  setValue('check_in_date', selected, { shouldDirty: true });
                  setValue('check_out_date', getNextDay(selected), {
                    shouldDirty: true,
                  });
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return true;
                  return createDisabledDateMatcher(
                    bookedDates,
                    booking.id,
                  )(date);
                }}
                minDate={new Date()}
                placeholder={DATE_PICKER_DISPLAY_FORMAT}
                className={bookingEditDatePickerClass}
              />
            </Field>
            <Field label="Check-out Date (MM-DD-YYYY)" required>
              <DatePicker
                date={
                  formSnapshot.check_out_date
                    ? stringToDate(formSnapshot.check_out_date)
                    : undefined
                }
                rangeEnd={
                  watchCheckInDate ? stringToDate(watchCheckInDate) : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  setValue('check_out_date', dateToString(date), {
                    shouldDirty: true,
                  });
                }}
                disabled={(date) => {
                  const isBooked = createDisabledCheckoutDateMatcher(
                    bookedDates,
                    booking.id,
                  )(date);
                  if (watchCheckInDate) {
                    const checkIn = stringToDate(watchCheckInDate);
                    if (date <= checkIn) return true;
                  }
                  return isBooked;
                }}
                minDate={
                  watchCheckInDate
                    ? stringToDate(getNextDay(watchCheckInDate))
                    : new Date()
                }
                placeholder={DATE_PICKER_DISPLAY_FORMAT}
                className={bookingEditDatePickerClass}
              />
            </Field>
          </Row2>
          <Row2>
            <Field label="Check-in Time">
              <Input
                type="time"
                {...register('check_in_time')}
                placeholder="14:00"
              />
            </Field>
            <Field label="Check-out Time">
              <Input
                type="time"
                {...register('check_out_time')}
                placeholder="11:00"
              />
            </Field>
          </Row2>
          <Row3>
            <Field label="Adults" required>
              <Input
                type="number"
                min={1}
                {...register('number_of_adults', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Children">
              <Input
                type="number"
                min={0}
                {...register('number_of_children', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Nights" required>
              <Input
                type="number"
                min={1}
                {...register('number_of_nights', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </Field>
          </Row3>
        </Section>

        {/* ── Parking ───────────────────────────────────────────────────────── */}
        <Section title="Parking">
          <CheckboxOption label="Needs parking" {...register('need_parking')} />
          {watchParking && (
            <Row3>
              <Field label="Plate Number">
                <Input
                  {...register('car_plate_number')}
                  placeholder="ABC 123"
                />
              </Field>
              <Field label="Brand / Model">
                <Input
                  {...register('car_brand_model')}
                  placeholder="Toyota Vios"
                />
              </Field>
              <Field label="Color">
                <Input {...register('car_color')} placeholder="White" />
              </Field>
            </Row3>
          )}
        </Section>

        {/* ── Pet Information ───────────────────────────────────────────────── */}
        <Section title="Pet Information">
          <CheckboxOption label="Has pets" {...register('has_pets')} />
          {watchPets && (
            <>
              <Row2>
                <Field label="Pet Name">
                  <Input {...register('pet_name')} />
                </Field>
                <Field label="Pet Type">
                  <Input {...register('pet_type')} placeholder="Dog / Cat" />
                </Field>
              </Row2>
              <Row3>
                <Field label="Breed">
                  <Input {...register('pet_breed')} />
                </Field>
                <Field label="Age">
                  <Input {...register('pet_age')} placeholder="2 years" />
                </Field>
                <Field label="Vaccination Date">
                  <DatePicker
                    date={
                      formSnapshot.pet_vaccination_date
                        ? stringToDate(formSnapshot.pet_vaccination_date)
                        : undefined
                    }
                    onSelect={(date) => {
                      setValue(
                        'pet_vaccination_date',
                        date ? dateToString(date) : '',
                        { shouldDirty: true },
                      );
                    }}
                    placeholder={DATE_PICKER_DISPLAY_FORMAT}
                    className={bookingEditDatePickerClass}
                  />
                </Field>
              </Row3>
            </>
          )}
        </Section>

        {/* ── Surprise decor ───────────────────────────────────────────────── */}
        <Section title="Surprise decor">
          <CheckboxOption
            label="Guest requested a surprise decor / room setup"
            {...register('guest_requests_surprise_decor')}
          />
          {surpriseDecorChangedFromSaved && (
            <div
              role="status"
              className="mt-2 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] leading-snug text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-100 sm:text-[13px]"
            >
              <Info
                className="mt-0.5 size-4 shrink-0 text-blue-600 sm:size-[18px]"
                aria-hidden
              />
              <p className="min-w-0">
                Please update the <strong>Additional fee</strong> field under{' '}
                <strong>Workflow Details → Review Pricing</strong> if you change
                this checkbox.
              </p>
            </div>
          )}
        </Section>

        {/* ── Other ─────────────────────────────────────────────────────────── */}
        <Section title="How They Found Us">
          <Row2>
            <Field label="Referral channel">
              <Input {...register('find_us')} placeholder="Facebook, Airbnb…" />
            </Field>
            <Field label="Details">
              <Input
                {...register('find_us_details')}
                placeholder="Referred by…"
              />
            </Field>
          </Row2>
        </Section>

        <Section title="Special Requests">
          <Field label="Requests / Notes">
            <textarea
              {...register('guest_special_requests')}
              rows={3}
              placeholder="Any special requests from the guest…"
              className={fieldControlClass}
            />
          </Field>
        </Section>

        <Section title="Booking Source">
          <Row2>
            <Field label="Platform">
              <NativeSelect {...register('booking_source', { required: true })}>
                {BOOKING_SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </Row2>
        </Section>

        {/* ── Documents ─────────────────────────────────────────────────────── */}
        <DocumentsSection booking={booking} onPreview={onPreview} />
      </CollapsibleGroup>

      <CollapsibleGroup
        id="progress-forms"
        title="Workflow Details"
        variant="nested"
        defaultOpen={false}
      >
        <BookingProgressFormsEdit
          booking={booking}
          onStateChange={setProgressFormState}
          onTouchedChange={setProgressTouched}
        />
      </CollapsibleGroup>

      <div className="flex items-center justify-end gap-3 px-3 py-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={updateMut.isPending}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden />
          Cancel
        </button>
        <Button
          type="submit"
          disabled={updateMut.isPending || !canSave}
          size="sm"
          className="min-h-[44px] rounded-lg px-5"
        >
          <Save className="size-3.5" />
          {updateMut.isPending
            ? 'Saving…'
            : showSensitiveRevertHint
              ? 'Save & Revert Status'
              : 'Save'}
        </Button>
      </div>
      </div>
    </form>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

type DocDef = {
  assetType: GuestDocAssetType;
  label: string;
  currentUrl: string | null | undefined;
  accept: string;
};

function DocumentsSection({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
}) {
  const isAirbnb = (booking.booking_source || 'Facebook') === 'Airbnb';
  const docs: DocDef[] = [
    ...(!isAirbnb
      ? ([
          {
            assetType: 'payment_receipt',
            label: 'Downpayment receipt',
            currentUrl: booking.payment_receipt_url,
            accept: 'image/*,.pdf',
          },
        ] as DocDef[])
      : []),
    {
      assetType: 'valid_id',
      label: 'Valid ID',
      currentUrl: booking.valid_id_url,
      accept: 'image/*,.pdf',
    },
    ...(booking.has_pets
      ? ([
          {
            assetType: 'pet_vaccination',
            label: 'Pet Vaccination Record',
            currentUrl: booking.pet_vaccination_url,
            accept: 'image/*,.pdf',
          },
          {
            assetType: 'pet_image',
            label: 'Pet Photo',
            currentUrl: booking.pet_image_url,
            accept: 'image/*',
          },
        ] as DocDef[])
      : []),
  ];

  return (
    <Section title="Documents" className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">
        Replacing or removing a file updates immediately — no need to press Save.
      </p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {docs.map((doc) => (
          <DocumentReplacer
            key={doc.assetType}
            bookingId={booking.id}
            onPreview={onPreview}
            {...doc}
          />
        ))}
      </div>
    </Section>
  );
}

function DocumentReplacer({
  bookingId,
  assetType,
  label,
  currentUrl,
  accept,
  onPreview,
}: DocDef & {
  bookingId: string;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadBookingAsset();
  const clearAssetMut = useClearBookingAsset();
  const [justUploaded, setJustUploaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const displayUrl = currentUrl
    ? (normalizeStoragePublicUrl(currentUrl) ?? currentUrl)
    : '';

  useEffect(() => {
    setThumbFailed(false);
  }, [currentUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMut.mutateAsync({ bookingId, assetType, file });
      setJustUploaded(true);
      const validation = result.receiptValidation;
      if (validation && assetType === 'valid_id') {
        if (validation.aiModelError) {
          showDocumentAiModelErrorToast(validation.aiModelError);
        } else {
          const toastMsg = receiptAiUploadToastMessage(
            validation.verdict,
            'valid_id',
          );
          if (toastMsg?.type === 'error') {
            toast.error(toastMsg.message, { description: toastMsg.description });
          } else if (toastMsg?.type === 'warning') {
            toast.warning(toastMsg.message);
          } else if (toastMsg?.type === 'success') {
            toast.success(toastMsg.message);
          } else {
            toast.success(`${label} replaced successfully`);
          }
        }
      } else {
        toast.success(`${label} replaced successfully`);
      }
      setTimeout(() => setJustUploaded(false), 3000);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to upload ${label}`,
      );
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleRemove() {
    setThumbFailed(false);
    setJustUploaded(false);
    if (inputRef.current) inputRef.current.value = '';
    try {
      await clearAssetMut.mutateAsync({ bookingId, assetType });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to remove ${label}`,
      );
    }
  }

  const isLoading = uploadMut.isPending;
  const isRemoving = clearAssetMut.isPending;
  const docType = displayUrl ? getDocType(displayUrl) : 'file';
  const showImageThumb = docType === 'image' && !thumbFailed;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5 ring-1 ring-border/20">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/70">
        {label}
      </p>

      {currentUrl ? (
        <WorkflowAssetPreviewWithRemove
          removing={isRemoving}
          uploading={isLoading}
          removeAriaLabel={`Remove ${label}`}
          onRemove={() => void handleRemove()}
          preview={
            <button
              type="button"
              aria-label={`Preview ${label}`}
              onClick={() => void onPreview(label, currentUrl)}
              className="group flex min-h-[44px] w-full items-center gap-2 overflow-hidden rounded-lg border border-border/55 bg-card p-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
            >
              {showImageThumb ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <img
                    src={displayUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setThumbFailed(true)}
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-500/15">
                  <FileText className="size-6 text-red-400 dark:text-red-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  Current file
                </p>
                <p className="flex items-center gap-0.5 text-[11px] text-blue-600 group-hover:underline dark:text-blue-400">
                  View
                </p>
              </div>
            </button>
          }
        />
      ) : (
        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/80 text-xs text-muted-foreground">
          No file uploaded
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <button
        type="button"
        disabled={isLoading || isRemoving}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
          justUploaded
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
            : 'bg-card text-foreground ring-1 ring-border/50 hover:bg-muted/40 hover:ring-primary/20 dark:ring-border/60',
          (isLoading || isRemoving) && 'cursor-not-allowed opacity-60',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Uploading…
          </>
        ) : justUploaded ? (
          <>
            <CheckCircle2 className="size-3.5" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="size-3.5" />
            {currentUrl ? 'Replace file' : 'Upload file'}
          </>
        )}
      </button>
    </div>
  );
}

function getDocType(url: string): 'image' | 'pdf' | 'file' {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'file';
}
