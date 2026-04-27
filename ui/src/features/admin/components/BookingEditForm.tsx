/**
 * BookingEditForm — inline edit form for all guest booking fields.
 *
 * Shown in the left column of BookingDetailPage when the admin clicks "Edit".
 * If the booking is READY_FOR_CHECKIN, saving material fields reverts status
 * back to PENDING_REVIEW per booking-workflow.mdc §2.3.
 *
 * Uses React Hook Form (no Zod for now — lightweight admin-only form).
 */

import React, { useRef, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUpdateBooking,
  type UpdateBookingPayload,
} from '@/features/admin/hooks/useUpdateBooking';
import {
  useUploadBookingAsset,
  type GuestDocAssetType,
} from '@/features/admin/hooks/useUploadBookingAsset';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  booking: BookingRow;
  onClose: () => void;
  onSaved: (updated: BookingRow) => void;
};

type FormValues = {
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
};

function toStr(v: string | null | undefined) {
  return v ?? '';
}

export function BookingEditForm({ booking, onClose, onSaved }: Props) {
  const isReadyForCheckin = booking.status === 'READY_FOR_CHECKIN';
  const updateMut = useUpdateBooking();

  const {
    register,
    handleSubmit,
    watch,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: {
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
      check_in_date: toStr(booking.check_in_date),
      check_out_date: toStr(booking.check_out_date),
      check_in_time: toStr(booking.check_in_time),
      check_out_time: toStr(booking.check_out_time),
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
      pet_vaccination_date: toStr(booking.pet_vaccination_date),
      find_us: toStr(booking.find_us),
      find_us_details: toStr(booking.find_us_details),
      guest_special_requests: toStr(booking.guest_special_requests),
    },
  });

  const watchParking = watch('need_parking');
  const watchPets = watch('has_pets');

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: UpdateBookingPayload = {
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
    };

    try {
      const updated = await updateMut.mutateAsync({
        bookingId: booking.id,
        payload,
        revertToPendingReview: isReadyForCheckin && isDirty,
      });

      if (isReadyForCheckin && isDirty) {
        toast.success('Booking updated — status reverted to Pending Review');
      } else {
        toast.success('Booking updated successfully');
      }
      onSaved(updated);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save booking');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* READY_FOR_CHECKIN warning */}
      {isReadyForCheckin && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Status will revert
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Saving changes from{' '}
              <span className="font-medium">Ready for Check-in</span> will
              revert the booking status back to{' '}
              <span className="font-medium">Pending Review</span>. Re-process
              the workflow to advance it again.
            </p>
          </div>
        </div>
      )}

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
            <Input
              {...register('check_in_date', { required: true })}
              placeholder="04-27-2026"
            />
          </Field>
          <Field label="Check-out Date (MM-DD-YYYY)" required>
            <Input
              {...register('check_out_date', { required: true })}
              placeholder="04-28-2026"
            />
          </Field>
        </Row2>
        <Row2>
          <Field label="Check-in Time">
            <Input {...register('check_in_time')} placeholder="2:00 PM" />
          </Field>
          <Field label="Check-out Time">
            <Input {...register('check_out_time')} placeholder="11:00 AM" />
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
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register('need_parking')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Needs parking</span>
        </label>
        {watchParking && (
          <Row3>
            <Field label="Plate Number">
              <Input {...register('car_plate_number')} placeholder="ABC 123" />
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
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register('has_pets')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Has pets</span>
        </label>
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
                <Input
                  {...register('pet_vaccination_date')}
                  placeholder="MM-DD-YYYY"
                />
              </Field>
            </Row3>
          </>
        )}
      </Section>

      {/* ── Other ─────────────────────────────────────────────────────────── */}
      <Section title="How They Found Us">
        <Row2>
          <Field label="Channel">
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
            className={inputClass}
          />
        </Field>
      </Section>

      {/* ── Documents ─────────────────────────────────────────────────────── */}
      <DocumentsSection booking={booking} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={updateMut.isPending}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
        >
          <X className="size-3.5" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateMut.isPending || !isDirty}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="size-3.5" />
          {updateMut.isPending
            ? 'Saving…'
            : isReadyForCheckin
              ? 'Save & Revert Status'
              : 'Save Changes'}
        </button>
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

function DocumentsSection({ booking }: { booking: BookingRow }) {
  const docs: DocDef[] = [
    {
      assetType: 'payment_receipt',
      label: 'Payment Receipt',
      currentUrl: booking.payment_receipt_url,
      accept: 'image/*,.pdf',
    },
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Documents
      </h3>
      <p className="text-xs text-slate-400">
        Replacing a file uploads it immediately — no need to press Save.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {docs.map((doc) => (
          <DocumentReplacer
            key={doc.assetType}
            bookingId={booking.id}
            {...doc}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentReplacer({
  bookingId,
  assetType,
  label,
  currentUrl,
  accept,
}: DocDef & { bookingId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadBookingAsset();
  const [justUploaded, setJustUploaded] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadMut.mutateAsync({ bookingId, assetType, file });
      setJustUploaded(true);
      toast.success(`${label} replaced successfully`);
      setTimeout(() => setJustUploaded(false), 3000);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to upload ${label}`,
      );
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  const isLoading = uploadMut.isPending;
  const docType = currentUrl ? getDocType(currentUrl) : 'file';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      {currentUrl ? (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 hover:border-blue-300 transition-colors"
        >
          {docType === 'image' ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
              <img
                src={currentUrl}
                alt={label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-red-50">
              <FileText className="size-6 text-red-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-slate-600">
              Current file
            </p>
            <p className="flex items-center gap-0.5 text-[11px] text-blue-600 group-hover:underline">
              <ExternalLink className="size-3 shrink-0" />
              View
            </p>
          </div>
        </a>
      ) : (
        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
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
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
          justUploaded
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800',
          isLoading && 'opacity-60 cursor-not-allowed',
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

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  );
}

function Row3({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none';

// forwardRef is required so React Hook Form's ref callback reaches the DOM <input>
// and can apply defaultValues. Without it React strips `ref` at the component boundary.
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} {...props} className={cn(inputClass, className)} />
));
Input.displayName = 'Input';
