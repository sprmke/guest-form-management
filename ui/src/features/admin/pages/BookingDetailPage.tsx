/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * Two-column layout on lg+:
 *   Left (flexible): all booking info cards + document previews
 *   Right (sticky 344px): WorkflowPanel
 *
 * Admin can switch the left column to an edit form via the "Edit" button.
 * If the booking is READY_FOR_CHECKIN, saving reverts status → PENDING_REVIEW.
 *
 * Design: dense-operational, status-color coded, mobile-first.
 * Plan: docs/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §Detail page
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Car,
  Dog,
  Edit2,
  ExternalLink,
  FileText,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  TestTube2,
  User,
  Users,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { WorkflowPanel } from '@/features/admin/components/WorkflowPanel';
import { BookingEditForm } from '@/features/admin/components/BookingEditForm';
import { useBooking } from '@/features/admin/hooks/useBooking';
import {
  formatBookingDate,
  formatMoney,
  formatRelative,
} from '@/features/admin/lib/formatters';
import { cn } from '@/lib/utils';
import type { BookingRow } from '@/features/admin/lib/types';

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const [editMode, setEditMode] = useState(false);

  const title =
    booking?.primary_guest_name ?? (isLoading ? 'Loading…' : 'Booking');

  const editButton = !editMode && booking && (
    <button
      onClick={() => setEditMode(true)}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[36px]"
    >
      <Edit2 className="size-3.5" />
      <span className="hidden sm:inline">Edit</span>
    </button>
  );

  return (
    <AdminLayout title={title} breadcrumb="Bookings" actions={editButton}>
      <div className="min-h-screen bg-[hsl(210_20%_98%)]">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
          {/* Back nav */}
          <Link
            to="/bookings"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Bookings
          </Link>

          {/* Loading */}
          {isLoading && <LoadingSkeleton />}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              Failed to load booking. Please refresh.
            </div>
          )}

          {/* Not found */}
          {!isLoading && !booking && !error && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Booking not found.
            </div>
          )}

          {booking && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
              {/* ── Left column ───────────────────────────────────────────── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Booking header */}
                <BookingHeader booking={booking} />

                {/* Edit mode */}
                {editMode ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-800">
                        Edit Booking Details
                      </h2>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </button>
                    </div>
                    <BookingEditForm
                      booking={booking}
                      onClose={() => setEditMode(false)}
                      onSaved={() => setEditMode(false)}
                    />
                  </div>
                ) : (
                  /* View mode info cards */
                  <>
                    <GuestInfoCard booking={booking} />
                    <AdditionalGuestsCard booking={booking} />
                    <StayDetailsCard booking={booking} />
                    {booking.need_parking && <ParkingCard booking={booking} />}
                    {booking.has_pets && <PetsCard booking={booking} />}
                    {(booking.find_us || booking.guest_special_requests) && (
                      <OtherInfoCard booking={booking} />
                    )}
                    {booking.booking_rate != null && (
                      <PricingCard booking={booking} />
                    )}
                    <DocumentsCard booking={booking} />
                  </>
                )}
              </div>

              {/* ── Right column — WorkflowPanel ───────────────────────────── */}
              <div className="w-full lg:w-[344px] lg:shrink-0 lg:sticky lg:top-[73px]">
                <WorkflowPanel booking={booking} />

                {/* Booking meta */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
                    Booking Meta
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <MetaRow label="Booking ID">
                      <span className="font-mono text-[11px] text-slate-600 break-all">
                        {booking.id}
                      </span>
                    </MetaRow>
                    <MetaRow label="Created">
                      {formatRelative(booking.created_at)}
                    </MetaRow>
                    {booking.updated_at && (
                      <MetaRow label="Updated">
                        {formatRelative(booking.updated_at)}
                      </MetaRow>
                    )}
                    {booking.is_test_booking && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1.5 ring-1 ring-violet-200">
                        <TestTube2 className="size-3.5 shrink-0 text-violet-600" />
                        <span className="text-[11px] font-semibold text-violet-700">
                          Test Booking
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Sub-sections ──────────────────────────────────────────────────────────────

function BookingHeader({ booking }: { booking: BookingRow }) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {booking.guest_facebook_name}
            </h1>
            {booking.is_test_booking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
                <TestTube2 className="size-3" />
                TEST
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{booking.primary_guest_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatBookingDate(booking.check_in_date)} →{' '}
              {formatBookingDate(booking.check_out_date)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {pax} pax · {booking.number_of_nights} night
              {booking.number_of_nights !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>
    </div>
  );
}

function GuestInfoCard({ booking }: { booking: BookingRow }) {
  return (
    <Card title="Guest Information" icon={<User className="size-3.5" />}>
      <Grid2>
        <InfoField
          label="Facebook / Airbnb Name"
          value={booking.guest_facebook_name}
        />
        <InfoField label="Primary Guest" value={booking.primary_guest_name} />
        <InfoField
          label="Email"
          value={booking.guest_email}
          icon={<Mail className="size-3.5 text-slate-400" />}
        />
        <InfoField
          label="Phone"
          value={booking.guest_phone_number}
          icon={<Phone className="size-3.5 text-slate-400" />}
        />
        <InfoField
          label="Address"
          value={booking.guest_address}
          icon={<MapPin className="size-3.5 text-slate-400" />}
        />
        <InfoField label="Nationality" value={booking.nationality} />
      </Grid2>
    </Card>
  );
}

function AdditionalGuestsCard({ booking }: { booking: BookingRow }) {
  const extra = [
    booking.guest2_name,
    booking.guest3_name,
    booking.guest4_name,
    booking.guest5_name,
  ].filter(Boolean) as string[];

  if (extra.length === 0) return null;

  return (
    <Card title="Additional Guests" icon={<Users className="size-3.5" />}>
      <div className="flex flex-wrap gap-2">
        {extra.map((name, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
          >
            <User className="size-3 text-slate-400" />
            {name}
          </span>
        ))}
      </div>
    </Card>
  );
}

function StayDetailsCard({ booking }: { booking: BookingRow }) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  return (
    <Card title="Stay Details" icon={<Calendar className="size-3.5" />}>
      <Grid2>
        <InfoField
          label="Check-in"
          value={`${formatBookingDate(booking.check_in_date)}${booking.check_in_time ? ` at ${booking.check_in_time}` : ''}`}
        />
        <InfoField
          label="Check-out"
          value={`${formatBookingDate(booking.check_out_date)}${booking.check_out_time ? ` at ${booking.check_out_time}` : ''}`}
        />
        <InfoField
          label="Duration"
          value={`${booking.number_of_nights} night${booking.number_of_nights !== 1 ? 's' : ''}`}
        />
        <InfoField
          label="Guests"
          value={`${booking.number_of_adults ?? 0} adult${(booking.number_of_adults ?? 0) !== 1 ? 's' : ''}${booking.number_of_children ? `, ${booking.number_of_children} child${booking.number_of_children !== 1 ? 'ren' : ''}` : ''} (${pax} pax)`}
        />
      </Grid2>
    </Card>
  );
}

function ParkingCard({ booking }: { booking: BookingRow }) {
  return (
    <Card title="Parking" icon={<Car className="size-3.5" />}>
      <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
        Non-refundable parking. Cannot be rescheduled after confirmation.
      </div>
      <Grid2>
        <InfoField label="Plate Number" value={booking.car_plate_number} />
        <InfoField
          label="Vehicle"
          value={[booking.car_brand_model, booking.car_color]
            .filter(Boolean)
            .join(' · ')}
        />
        {booking.parking_rate_guest != null && (
          <InfoField
            label="Guest Parking Rate"
            value={formatMoney(booking.parking_rate_guest as number)}
          />
        )}
        {booking.parking_rate_paid != null && (
          <InfoField
            label="Paid Parking Rate"
            value={formatMoney(booking.parking_rate_paid as number)}
          />
        )}
        {booking.parking_owner_email && (
          <InfoField
            label="Parking Owner Email"
            value={booking.parking_owner_email}
          />
        )}
      </Grid2>
      {booking.parking_endorsement_url && (
        <div className="mt-3">
          <DocPreview
            label="Parking Endorsement"
            url={booking.parking_endorsement_url}
          />
        </div>
      )}
    </Card>
  );
}

function PetsCard({ booking }: { booking: BookingRow }) {
  return (
    <Card title="Pet Information" icon={<Dog className="size-3.5" />}>
      <Grid2>
        <InfoField label="Pet Name" value={booking.pet_name} />
        <InfoField label="Type" value={booking.pet_type} />
        <InfoField label="Breed" value={booking.pet_breed} />
        <InfoField label="Age" value={booking.pet_age} />
        <InfoField
          label="Vaccination Date"
          value={formatBookingDate(booking.pet_vaccination_date)}
        />
        {booking.pet_fee != null && (
          <InfoField
            label="Pet Fee"
            value={formatMoney(booking.pet_fee as number)}
          />
        )}
      </Grid2>
      {(booking.pet_image_url ||
        booking.pet_vaccination_url ||
        booking.approved_pet_pdf_url) && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {booking.pet_image_url && (
            <DocPreview label="Pet Photo" url={booking.pet_image_url} />
          )}
          {booking.pet_vaccination_url && (
            <DocPreview
              label="Vaccination Record"
              url={booking.pet_vaccination_url}
            />
          )}
          {booking.approved_pet_pdf_url && (
            <DocPreview
              label="Approved Pet Form"
              url={booking.approved_pet_pdf_url}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function OtherInfoCard({ booking }: { booking: BookingRow }) {
  return (
    <Card title="Other Information" icon={<Info className="size-3.5" />}>
      {(booking.find_us || booking.find_us_details) && (
        <div className="mb-3">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            How they found us
          </p>
          <div className="flex flex-wrap gap-2">
            {booking.find_us && (
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                <Search className="size-3 text-slate-400" />
                {booking.find_us}
              </span>
            )}
            {booking.find_us_details && (
              <span className="text-xs text-slate-600 py-1">
                {booking.find_us_details}
              </span>
            )}
          </div>
        </div>
      )}
      {booking.guest_special_requests && (
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Special Requests
          </p>
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            {booking.guest_special_requests}
          </p>
        </div>
      )}
    </Card>
  );
}

function PricingCard({ booking }: { booking: BookingRow }) {
  return (
    <Card title="Pricing" icon={<FileText className="size-3.5" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {booking.booking_rate != null && (
          <PriceChip
            label="Booking Rate"
            value={formatMoney(booking.booking_rate as number)}
          />
        )}
        {booking.down_payment != null && (
          <PriceChip
            label="Down Payment"
            value={formatMoney(booking.down_payment as number)}
          />
        )}
        {booking.balance != null && (
          <PriceChip
            label="Balance"
            value={formatMoney(booking.balance as number)}
            highlight
          />
        )}
        {booking.security_deposit != null && (
          <PriceChip
            label="Security Deposit"
            value={formatMoney(booking.security_deposit as number)}
          />
        )}
      </div>
      {booking.approved_gaf_pdf_url && (
        <div className="mt-3">
          <DocPreview label="Approved GAF" url={booking.approved_gaf_pdf_url} />
        </div>
      )}
      {booking.sd_refund_amount != null && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold text-emerald-800">
            SD Refund Amount
          </p>
          <p className="text-sm font-bold text-emerald-800">
            {formatMoney(booking.sd_refund_amount as number)}
          </p>
        </div>
      )}
      {booking.sd_refund_receipt_url && (
        <div className="mt-3">
          <DocPreview
            label="SD Refund Receipt"
            url={booking.sd_refund_receipt_url}
          />
        </div>
      )}
    </Card>
  );
}

function DocumentsCard({ booking }: { booking: BookingRow }) {
  const docs = [
    { label: 'Payment Receipt', url: booking.payment_receipt_url },
    { label: 'Valid ID', url: booking.valid_id_url },
    { label: 'Booking PDF', url: booking.pdf_url },
  ].filter((d): d is { label: string; url: string } => !!d.url);

  if (docs.length === 0) return null;

  return (
    <Card title="Documents" icon={<FileText className="size-3.5" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {docs.map((d) => (
          <DocPreview key={d.label} label={d.label} url={d.url} />
        ))}
      </div>
    </Card>
  );
}

// ─── Document preview ─────────────────────────────────────────────────────────

function getDocType(url: string): 'image' | 'pdf' | 'file' {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'file';
}

function DocPreview({ label, url }: { label: string; url: string }) {
  const type = getDocType(url);
  const [imgError, setImgError] = useState(false);

  if (type === 'image' && !imgError) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
      >
        <div className="relative aspect-video bg-slate-100 overflow-hidden">
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <ExternalLink className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-white">
          <span className="truncate text-[11px] font-medium text-slate-600">
            {label}
          </span>
          <ExternalLink className="size-3 shrink-0 text-slate-400" />
        </div>
      </a>
    );
  }

  if (type === 'pdf') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-red-300 hover:bg-red-50 transition-all min-h-[100px]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 group-hover:bg-red-200 transition-colors">
          <FileText className="size-5 text-red-600" />
        </div>
        <span className="text-center text-[11px] font-medium text-slate-600 leading-tight">
          {label}
        </span>
        <span className="text-[10px] text-slate-400 group-hover:text-red-500 transition-colors">
          Open PDF
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100 transition-colors"
    >
      <ExternalLink className="size-4 shrink-0 text-slate-400" />
      <span className="truncate text-xs font-medium text-slate-700">
        {label}
      </span>
    </a>
  );
}

// ─── Reusable atoms ───────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

function InfoField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
}) {
  if (value === null || value === undefined || value === '' || value === '—')
    return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-slate-800">
        {icon}
        {String(value)}
      </span>
    </div>
  );
}

function PriceChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-xl border p-3',
        highlight
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-slate-50',
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-bold',
          highlight ? 'text-blue-700' : 'text-slate-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-[11px] text-slate-400">{label}</span>
      <span className="text-right text-[11px] text-slate-600">{children}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-xl bg-slate-200" />
      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="hidden lg:block w-80 h-64 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}
