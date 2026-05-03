/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * Two-column layout on lg+:
 *   Left (flexible): all booking info cards + document previews
 *   Right (sticky 344px): WorkflowPanel
 *
 * Header card toggles **Edit** ↔ **Cancel**; booking status is shown on the
 * **Progress** card in `WorkflowPanel`. **Cancel booking** stays in the workflow panel Actions.
 * While the booking is in Pending documents (GAF / parking / pet) or Ready for check-in,
 * saving workflow-sensitive guest fields reverts status → PENDING_REVIEW; replacing
 * payment/ID/pet docs via upload does too.
 *
 * **Pricing** card (below Stay Details): omitted in `PENDING_REVIEW`; afterward shows
 * review-pricing fields, total guest balance vs paid/unpaid, receipts, and on
 * `COMPLETED` the SD refund block.
 *
 * Design: dense-operational, status-color coded, mobile-first.
 * Plan: docs/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §Detail page
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Car,
  CheckCircle2,
  Dog,
  Edit2,
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Loader2,
  Search,
  Sparkles,
  TestTube2,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { WorkflowPanel } from '@/features/admin/components/WorkflowPanel';
import { BookingEditForm } from '@/features/admin/components/BookingEditForm';
import { useBooking } from '@/features/admin/hooks/useBooking';
import {
  formatBookingDate,
  formatMoney,
  formatRelative,
} from '@/features/admin/lib/formatters';
import type {
  BookingRow,
  SdSettlementLineItem,
} from '@/features/admin/lib/types';
import {
  normalizeStoragePublicUrl,
  parseStorageUrl,
  PRIVATE_STORAGE_BUCKETS,
  resolveAssetUrlForBrowser,
} from '@/features/admin/lib/storageUrls';
import {
  computeTotalGuestBalance,
  guestBalancePaidRecorded,
} from '@/features/admin/lib/totalGuestBalance';

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const [editMode, setEditMode] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{
    label: string;
    url: string;
    type: 'image' | 'pdf' | 'file';
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const title =
    booking?.primary_guest_name ?? (isLoading ? 'Loading…' : 'Booking');

  const handlePreview = async (label: string, rawUrl: string) => {
    setPreviewLoading(true);
    try {
      const resolved = await resolveAssetUrlForBrowser(rawUrl);
      setPreviewAsset({
        label,
        url: resolved,
        type: getDocType(resolved),
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to open document',
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <AdminLayout title={title} breadcrumb="Bookings">
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
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                {/* ── Left column ───────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Booking header */}
                  <BookingHeader
                    booking={booking}
                    editMode={editMode}
                    onEdit={() => setEditMode(true)}
                    onCancelEdit={() => setEditMode(false)}
                  />

                  {/* Edit mode */}
                  {editMode ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5">
                      <h2 className="mb-4 text-sm font-bold text-slate-800">
                        Edit Booking Details
                      </h2>
                      <BookingEditForm
                        booking={booking}
                        onClose={() => setEditMode(false)}
                        onSaved={() => setEditMode(false)}
                        onPreview={handlePreview}
                      />
                    </div>
                  ) : (
                    /* View mode info cards */
                    <>
                      <GuestInfoCard
                        booking={booking}
                        onPreview={handlePreview}
                      />
                      <AdditionalGuestsCard booking={booking} />
                      <StayDetailsCard booking={booking} />
                      <PricingSummaryCard
                        booking={booking}
                        onPreview={handlePreview}
                      />
                      {booking.need_parking && (
                        <ParkingCard
                          booking={booking}
                          onPreview={handlePreview}
                        />
                      )}
                      {booking.has_pets && (
                        <PetsCard booking={booking} onPreview={handlePreview} />
                      )}
                      {(booking.find_us || booking.guest_special_requests) && (
                        <OtherInfoCard booking={booking} />
                      )}
                      <DocumentsCard
                        booking={booking}
                        onPreview={handlePreview}
                      />
                    </>
                  )}
                </div>

                {/* ── Right column — WorkflowPanel ───────────────────────────── */}
                <div className="w-full lg:w-[370px] lg:shrink-0 lg:sticky lg:top-[58px]">
                  <WorkflowPanel key={booking.id} booking={booking} />

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
            </>
          )}
        </div>
      </div>
      <AssetPreviewModal
        asset={previewAsset}
        loading={previewLoading}
        onClose={() => {
          if (!previewLoading) setPreviewAsset(null);
        }}
      />
    </AdminLayout>
  );
}

// ─── Sub-sections ──────────────────────────────────────────────────────────────

function BookingHeader({
  booking,
  editMode,
  onEdit,
  onCancelEdit,
}: {
  booking: BookingRow;
  editMode: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-bold text-slate-900">
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
        <div className="flex w-full flex-wrap items-start justify-end gap-2 sm:w-auto sm:max-w-[min(100%,280px)]">
          {editMode ? (
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel and close the form"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-3"
            >
              <X className="size-3 shrink-0" aria-hidden />
              <span className="inline">Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-3"
            >
              <Edit2 className="size-3 shrink-0" aria-hidden />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestInfoCard({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
}) {
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
      {(booking.approved_gaf_pdf_url || booking.valid_id_url) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {booking.approved_gaf_pdf_url && (
            <DocPreview
              label="Approved GAF"
              url={booking.approved_gaf_pdf_url}
              onPreview={onPreview}
            />
          )}
          {booking.valid_id_url && (
            <DocPreview
              label="Valid ID"
              url={booking.valid_id_url}
              onPreview={onPreview}
            />
          )}
        </div>
      )}
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

function ParkingCard({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
}) {
  return (
    <Card title="Parking" icon={<Car className="size-3.5" />}>
      <Grid2>
        <InfoField label="Plate Number" value={booking.car_plate_number} />
        <InfoField
          label="Vehicle"
          value={[booking.car_brand_model, booking.car_color]
            .filter(Boolean)
            .join(' · ')}
        />
        {booking.parking_owner?.trim() ? (
          <InfoField
            label="Parking owner / agent"
            value={booking.parking_owner}
          />
        ) : null}
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
      </Grid2>
      {booking.parking_endorsement_url && (
        <div className="mt-3">
          <DocPreview
            label="Parking Endorsement"
            url={booking.parking_endorsement_url}
            onPreview={onPreview}
          />
        </div>
      )}
    </Card>
  );
}

function PetsCard({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
}) {
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
            <DocPreview
              label="Pet Photo"
              url={booking.pet_image_url}
              onPreview={onPreview}
            />
          )}
          {booking.pet_vaccination_url && (
            <DocPreview
              label="Vaccination Record"
              url={booking.pet_vaccination_url}
              onPreview={onPreview}
            />
          )}
          {booking.approved_pet_pdf_url && (
            <DocPreview
              label="Approved Pet Form"
              url={booking.approved_pet_pdf_url}
              onPreview={onPreview}
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

const SD_REFUND_METHOD_LABELS: Record<string, string> = {
  same_phone: 'Refund to same phone (GCash)',
  other_bank: 'Bank transfer',
  cash: 'Cash pickup',
};

function parseSdNumberArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseSdLineItemsFromBooking(raw: unknown): SdSettlementLineItem[] {
  let arr: unknown = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      arr = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((row) => {
    if (typeof row !== 'object' || row === null) {
      return { label: '', amount: 0 };
    }
    const r = row as Record<string, unknown>;
    const label = typeof r.label === 'string' ? r.label : '';
    const n = Number(r.amount);
    return { label, amount: Number.isNaN(n) ? 0 : n };
  });
}

function buildSdExpenseProfitRows(booking: BookingRow): {
  expenses: SdSettlementLineItem[];
  profits: SdSettlementLineItem[];
} {
  const expJson = parseSdLineItemsFromBooking(
    booking.sd_additional_expense_items,
  );
  const profJson = parseSdLineItemsFromBooking(
    booking.sd_additional_profit_items,
  );
  const expFallback = parseSdNumberArray(booking.sd_additional_expenses).map(
    (amount, i) => ({
      label: `Expense line ${i + 1}`,
      amount,
    }),
  );
  const profFallback = parseSdNumberArray(booking.sd_additional_profits).map(
    (amount, i) => ({
      label: `Profit line ${i + 1}`,
      amount,
    }),
  );
  return {
    expenses: expJson.length ? expJson : expFallback,
    profits: profJson.length ? profJson : profFallback,
  };
}

/**
 * Post-review pricing + payment proof; on COMPLETED, adds SD refund settlement fields.
 * Hidden while status is PENDING_REVIEW (rates captured on first workflow transition).
 */
function PricingSummaryCard({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
}) {
  if (booking.status === 'PENDING_REVIEW') return null;

  const isCompleted = booking.status === 'COMPLETED';
  const totalGuestBalance = computeTotalGuestBalance(booking);
  const paidTowardBalance = guestBalancePaidRecorded(booking);
  const unpaidCents =
    totalGuestBalance != null
      ? Math.round(totalGuestBalance * 100) -
        Math.round(paidTowardBalance * 100)
      : null;
  const { expenses: sdExpenses, profits: sdProfits } =
    buildSdExpenseProfitRows(booking);

  const hasPaymentReceipt = Boolean(booking.payment_receipt_url?.trim());
  const hasBalanceReceipt = Boolean(
    booking.guest_balance_payment_receipt_url?.trim(),
  );

  return (
    <Card title="Pricing" icon={<Banknote className="size-3.5" />}>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
        Rates & fees
      </p>
      <Grid3>
        <InfoField
          label="Booking rate"
          value={formatMoney(booking.booking_rate as number)}
        />
        <InfoField
          label="Down payment"
          value={formatMoney(booking.down_payment as number)}
        />
        <InfoField
          label="Security deposit"
          value={formatMoney(booking.security_deposit as number)}
        />
        <InfoField
          label="Balance after down (recorded)"
          value={formatMoney(booking.balance as number)}
        />
        <InfoField
          label="Pet fee"
          value={formatMoney(booking.pet_fee as number)}
        />
        <InfoField
          label="Parking fee (guest)"
          value={formatMoney(booking.parking_rate_guest as number)}
        />
        <InfoField
          label="Parking rate (paid)"
          value={formatMoney(booking.parking_rate_paid as number)}
        />
        <InfoField
          label="Additional guest fee"
          value={formatMoney(booking.guest_additional_fee as number)}
        />
      </Grid3>

      {totalGuestBalance != null && (
        <div className="mt-3 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
          <div className="divide-y divide-slate-200/80">
            <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Total guest balance
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-slate-900">
                {formatMoney(totalGuestBalance)}
              </span>
            </div>
            <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Balance Amount Paid
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-slate-900">
                {paidTowardBalance > 0 ? formatMoney(paidTowardBalance) : '—'}
              </span>
            </div>
            <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Total unpaid
              </span>
              <div className="flex min-h-9 justify-end">
                {unpaidCents !== null && unpaidCents <= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    Paid in full
                  </span>
                ) : (
                  <span className="text-right text-sm font-semibold tabular-nums text-amber-900">
                    {unpaidCents != null ? formatMoney(unpaidCents / 100) : '—'}
                  </span>
                )}
              </div>
            </div>
          </div>
          {unpaidCents !== null && unpaidCents < 0 && (
            <p className="border-t border-slate-200/80 px-3 py-2 text-[10.5px] leading-snug text-slate-500 sm:px-3.5">
              Recorded payments exceed total guest balance by{' '}
              {formatMoney(Math.abs(unpaidCents) / 100)}.
            </p>
          )}
        </div>
      )}

      {(hasPaymentReceipt || hasBalanceReceipt) && (
        <div className="mt-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Payment receipts
          </p>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            {hasPaymentReceipt && (
              <DocPreview
                label="Downpayment receipt"
                url={booking.payment_receipt_url!.trim()}
                onPreview={onPreview}
              />
            )}
            {hasBalanceReceipt && (
              <DocPreview
                label="Payment balance receipt"
                url={booking.guest_balance_payment_receipt_url!.trim()}
                onPreview={onPreview}
              />
            )}
          </div>
        </div>
      )}

      {isCompleted && booking.next_stay_voucher_code && (
        <NextStayVoucherCard booking={booking} />
      )}

      {isCompleted && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Security deposit refund
          </p>
          <Grid2>
            <InfoField
              label="SD refund amount"
              value={formatMoney(booking.sd_refund_amount as number)}
            />
            <InfoField
              label="Refund method"
              value={
                booking.sd_refund_method
                  ? (SD_REFUND_METHOD_LABELS[booking.sd_refund_method] ??
                    booking.sd_refund_method)
                  : undefined
              }
            />
            <InfoField
              label="Refund bank"
              value={booking.sd_refund_bank ?? undefined}
            />
            <InfoField
              label="Account name"
              value={booking.sd_refund_account_name ?? undefined}
            />
            <InfoField
              label="Account number"
              value={booking.sd_refund_account_number ?? undefined}
            />
            <InfoField
              label="Phone confirmed for refund"
              value={
                booking.sd_refund_phone_confirmed === true
                  ? 'Yes'
                  : booking.sd_refund_phone_confirmed === false
                    ? 'No'
                    : undefined
              }
            />
            <InfoField
              label="Guest feedback"
              value={booking.sd_refund_guest_feedback ?? undefined}
            />
            <InfoField
              label="SD form emailed"
              value={
                booking.sd_refund_form_emailed_at
                  ? formatRelative(booking.sd_refund_form_emailed_at)
                  : undefined
              }
            />
            <InfoField
              label="SD form submitted"
              value={
                booking.sd_refund_form_submitted_at
                  ? formatRelative(booking.sd_refund_form_submitted_at)
                  : undefined
              }
            />
            <InfoField
              label="Settled"
              value={
                booking.settled_at
                  ? formatRelative(booking.settled_at)
                  : undefined
              }
            />
          </Grid2>

          {sdExpenses.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Additional SD expenses
              </p>
              <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                {sdExpenses.map((row, i) => (
                  <li
                    key={`e-${i}`}
                    className="flex justify-between gap-2 text-xs text-slate-700"
                  >
                    <span className="min-w-0 truncate">
                      {row.label?.trim() || `Line ${i + 1}`}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sdProfits.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Additional SD profits
              </p>
              <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                {sdProfits.map((row, i) => (
                  <li
                    key={`p-${i}`}
                    className="flex justify-between gap-2 text-xs text-slate-700"
                  >
                    <span className="min-w-0 truncate">
                      {row.label?.trim() || `Line ${i + 1}`}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {booking.sd_refund_receipt_url && (
            <div className="mt-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
                Refund receipt
              </p>
              <DocPreview
                label="SD refund receipt"
                url={booking.sd_refund_receipt_url}
                onPreview={onPreview}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Next-stay voucher awarded on /sd-form (Facebook-review thank-you).
 * Rendered inside the Pricing card only when status === COMPLETED so admins
 * can verify the discount on the guest's next booking.
 */
function NextStayVoucherCard({ booking }: { booking: BookingRow }) {
  const code = booking.next_stay_voucher_code;
  if (!code) return null;
  const amountRaw = booking.next_stay_voucher_amount;
  const amount =
    amountRaw == null
      ? null
      : typeof amountRaw === 'string'
        ? Number(amountRaw)
        : amountRaw;
  const awardedAt = booking.next_stay_voucher_awarded_at;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
        Next-stay voucher
      </p>
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 px-4 py-3 ring-1 ring-emerald-100/80">
        <Sparkles
          className="absolute right-3 top-3 size-4 text-emerald-500/70"
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Ticket className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-slate-900 sm:text-base">
              {code}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {amount != null ? formatMoney(amount) : '—'} off the next booking
              {awardedAt && (
                <>
                  {' · '}
                  <span title={awardedAt}>
                    awarded {formatRelative(awardedAt)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsCard({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
}) {
  const docs = [{ label: 'Booking PDF', url: booking.pdf_url }].filter(
    (d): d is { label: string; url: string } => !!d.url,
  );

  if (docs.length === 0) return null;

  return (
    <Card title="Documents" icon={<FileText className="size-3.5" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {docs.map((d) => (
          <DocPreview
            key={d.label}
            label={d.label}
            url={d.url}
            onPreview={onPreview}
          />
        ))}
      </div>
    </Card>
  );
}

// ─── Document preview ─────────────────────────────────────────────────────────

function getDocType(url: string): 'image' | 'pdf' | 'file' {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|heic|heif)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'file';
}

function docPreviewOuterWidth() {
  return 'min-w-0 w-full max-w-full lg:max-w-[255px]';
}

function DocPreview({
  label,
  url,
  onPreview,
}: {
  label: string;
  url: string;
  onPreview: (label: string, rawUrl: string) => void;
}) {
  const normalized = normalizeStoragePublicUrl(url) ?? url;
  const parsed = parseStorageUrl(normalized);
  const inPrivateBucket = Boolean(
    parsed && PRIVATE_STORAGE_BUCKETS.has(parsed.bucket),
  );
  const layoutType = getDocType(normalized);
  /** Private objects may omit a recognizable extension; still resolve a signed URL. */
  const needsResolve =
    inPrivateBucket || layoutType === 'image' || layoutType === 'pdf';
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const n = normalizeStoragePublicUrl(url) ?? url;
    const loc = parseStorageUrl(n);
    const priv = Boolean(loc && PRIVATE_STORAGE_BUCKETS.has(loc.bucket));
    const t = getDocType(n);
    if (!priv && t === 'file') {
      setDisplayUrl(n);
      setImgError(false);
      return;
    }
    let cancelled = false;
    setDisplayUrl(null);
    setImgError(false);
    resolveAssetUrlForBrowser(url)
      .then((u) => {
        if (!cancelled) setDisplayUrl(u);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(n);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const hrefForOpen = displayUrl ?? normalized;

  if (needsResolve && !displayUrl) {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${docPreviewOuterWidth()}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-slate-100">
          <Loader2 className="size-8 animate-spin text-slate-400" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="truncate text-[11px] font-medium text-slate-500">
            {label}
          </span>
        </div>
      </div>
    );
  }

  if (layoutType === 'image' && imgError) {
    return (
      <a
        href={hrefForOpen}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onPreview(label, url);
        }}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100 ${docPreviewOuterWidth()}`}
      >
        <ExternalLink className="size-4 shrink-0 text-slate-400" />
        <span className="truncate text-xs font-medium text-slate-700">
          {label}
        </span>
      </a>
    );
  }

  if (layoutType === 'image' && !imgError) {
    return (
      <a
        href={hrefForOpen}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onPreview(label, url);
        }}
        className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-blue-300 hover:shadow-md ${docPreviewOuterWidth()}`}
      >
        <div className="relative aspect-video bg-slate-100 overflow-hidden">
          <img
            src={hrefForOpen}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <ExternalLink className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-white">
          <span className="truncate inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <ImageIcon className="size-3 shrink-0 text-slate-400" />
            <span className="truncate">{label}</span>
          </span>
          <ExternalLink className="size-3 shrink-0 text-slate-400" />
        </div>
      </a>
    );
  }

  if (layoutType === 'pdf') {
    return (
      <a
        href={hrefForOpen}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onPreview(label, url);
        }}
        className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-blue-300 hover:shadow-md ${docPreviewOuterWidth()}`}
      >
        <div className="relative aspect-video bg-slate-100 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-rose-100">
            <FileText className="size-10 text-rose-500" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <ExternalLink className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-white">
          <span className="truncate inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <FileText className="size-3 shrink-0 text-rose-500" />
            <span className="truncate">{label}</span>
          </span>
          <ExternalLink className="size-3 shrink-0 text-slate-400" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={hrefForOpen}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        onPreview(label, url);
      }}
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100 ${docPreviewOuterWidth()}`}
    >
      <ExternalLink className="size-4 shrink-0 text-slate-400" />
      <span className="truncate text-xs font-medium text-slate-700">
        {label}
      </span>
    </a>
  );
}

function AssetPreviewModal({
  asset,
  loading,
  onClose,
}: {
  asset: { label: string; url: string; type: 'image' | 'pdf' | 'file' } | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!asset && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-[1px] p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={asset ? `Preview ${asset.label}` : 'Loading preview'}
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-[calc(100vh-1rem)] w-full max-w-4xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl sm:h-[calc(100vh-2rem)] sm:max-w-5xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-[52px] items-center justify-between border-b border-slate-200 px-2.5 sm:min-h-[56px] sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
              {asset?.label ?? 'Loading preview...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {asset && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[44px] sm:px-3 sm:text-xs"
              >
                Open in new tab
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 sm:min-h-[44px] sm:min-w-[44px]"
              aria-label="Close preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 p-1.5 sm:p-3">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 text-slate-600">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          )}

          {!loading && asset?.type === 'image' && (
            <div className="flex h-full items-center justify-center overflow-auto rounded-lg bg-white">
              <img
                src={asset.url}
                alt={asset.label}
                className="max-h-full w-auto object-contain"
              />
            </div>
          )}

          {!loading && asset?.type !== 'image' && asset && (
            <iframe
              title={asset.label}
              src={asset.url}
              className="h-full w-full rounded-lg bg-white"
            />
          )}
        </div>
      </div>
    </div>
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

/** Rates-style dense grid: 1 col mobile, 2 on small tablet, 3 from md up. */
function Grid3({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
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
