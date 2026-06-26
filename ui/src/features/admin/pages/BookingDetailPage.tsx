/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * Two-column layout on lg+:
 *   Left (flexible): all booking info cards + document previews
 *   Right (344px): WorkflowPanel
 *
 * Mobile (<md): compact summary + expand control; Progress (WorkflowPanel) next;
 * Tablet (md–lg): two-column layout like desktop; sidebar still hidden until lg.
 * full detail cards in a collapsible block (all statuses). Edit lives in the
 * expanded header, not on the collapsed summary strip.
 *
 * Header card toggles **Edit** ↔ **Cancel**; booking status is shown on the
 * **Progress** card in `WorkflowPanel` (after `PendingReviewWorkflowGate` when
 * status is `PENDING_REVIEW`). **Cancel booking** stays in the workflow panel Actions.
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

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Car,
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
  Ticket,
  User,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { BookingDetailPageSkeleton } from "@/components/skeletons/AdminSkeletons";
import { BookingDetailMobileSummary } from "@/features/admin/components/BookingDetailMobileSummary";
import { BookingMetaCard } from "@/features/admin/components/BookingMetaCard";
import { PendingReviewWorkflowGate } from "@/features/admin/components/PendingReviewWorkflowGate";
import { WorkflowPanel } from "@/features/admin/components/WorkflowPanel";
import { BookingEditForm } from "@/features/admin/components/BookingEditForm";
import { useIsBelowMd } from "@/hooks/useMediaQuery";
import { useBooking } from "@/features/admin/hooks/useBooking";
import {
  receiptAiPreviewLoading,
  useReceiptAiBackfill,
} from "@/features/admin/hooks/useReceiptAiBackfill";
import {
  formatBookingDate,
  formatBookingDateTime,
  formatMoney,
  formatRelative,
} from "@/features/admin/lib/formatters";
import type { BookingRow } from "@/features/admin/lib/types";
import {
  ADMIN_GUEST_VIEW_SLOTS,
  shouldShowAdminGuestViewSlot,
} from "@/features/admin/lib/adminGuestSlots";
import { requiresValidId } from "@/features/guest-form/lib/guestCounts";
import {
  normalizeStoragePublicUrl,
  parseStorageUrl,
  PRIVATE_STORAGE_BUCKETS,
  resolveAssetUrlForBrowser,
  isStorageObjectNotFoundError,
} from "@/features/admin/lib/storageUrls";
import { BookingPricingSummary } from "@/features/admin/components/BookingPricingSummary";
import {
  ReceiptAiVerdictBadge,
  type DocumentAiVerdictVariant,
  type ReceiptAiVerdict,
} from "@/features/admin/components/ReceiptAiVerdictBadge";
import {
  PayParkingHeaderButton,
  PayParkingModal,
} from "@/features/admin/components/PayParkingModal";
import { buildPayParkingPath } from "@/features/pay-parking/lib/api";
import { hasPayParkingAvailed } from "@/features/pay-parking/lib/payParkingHelpers";
import { isStaycationVoucher } from "@/features/sd-form/lib/voucher";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const { isBackfilling: isReceiptAiBackfilling } = useReceiptAiBackfill(booking);
  const [editMode, setEditMode] = useState(false);
  const [payParkingModalOpen, setPayParkingModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{
    label: string;
    url: string;
    rawUrl: string;
    type: "image" | "pdf" | "file";
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const isBelowMd = useIsBelowMd();

  const copyBookingIdToClipboard = useCallback(async () => {
    const id = bookingId?.trim();
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [bookingId]);

  useEffect(() => {
    setDetailsExpanded(false);
    setEditMode(false);
  }, [bookingId]);

  useEffect(() => {
    if (editMode) setDetailsExpanded(true);
  }, [editMode]);

  /** Collapsed guest cards on mobile so Progress stays above the fold. */
  const isMobileWorkflowFirst = isBelowMd && booking != null;

  const showMobileDetailCards =
    !isMobileWorkflowFirst || detailsExpanded || editMode;

  /** Expanded details sit between summary and Progress on mobile (not below the fold). */
  const mobileDetailsBeforeWorkflow =
    isMobileWorkflowFirst && showMobileDetailCards;

  const handleToggleDetails = useCallback(() => {
    setDetailsExpanded((was) => !was);
  }, []);

  const handleStartEdit = useCallback(() => {
    setEditMode(true);
  }, []);

  const handleOpenPayParking = useCallback(() => {
    if (!booking) return;
    if (hasPayParkingAvailed(booking)) {
      navigate(buildPayParkingPath(booking.id, { admin: true }));
      return;
    }
    setPayParkingModalOpen(true);
  }, [booking, navigate]);

  const handlePreview = async (label: string, rawUrl: string) => {
    setPreviewLoading(true);
    try {
      const resolved = await resolveAssetUrlForBrowser(rawUrl);
      setPreviewAsset({
        label,
        url: resolved,
        rawUrl,
        type: getDocType(resolved),
      });
    } catch (err) {
      toast.error(
        isStorageObjectNotFoundError(err)
          ? "This file is no longer in storage"
          : err instanceof Error
            ? err.message
            : "Failed to open document",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
          {/* Back nav */}
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Bookings
          </Link>

          {/* Loading */}
          {isLoading && <BookingDetailPageSkeleton />}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              Failed to load booking. Please refresh.
            </div>
          )}

          {/* Not found */}
          {!isLoading && !booking && !error && (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Booking not found.
            </div>
          )}

          {booking && (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5 lg:gap-6">
                {isMobileWorkflowFirst && (
                  <BookingDetailMobileSummary
                    className="order-1 md:hidden"
                    booking={booking}
                    detailsExpanded={detailsExpanded}
                    onToggleDetails={handleToggleDetails}
                    onPayParking={handleOpenPayParking}
                    editMode={editMode}
                    onEdit={handleStartEdit}
                    onCancelEdit={() => setEditMode(false)}
                  />
                )}

                {/* ── Full booking details (collapsible on mobile) ───────────── */}
                <Collapsible
                  open={showMobileDetailCards}
                  onOpenChange={(open) => {
                    if (isMobileWorkflowFirst && !editMode) {
                      setDetailsExpanded(open);
                    }
                  }}
                  className={cn(
                    "flex-1 min-w-0",
                    isMobileWorkflowFirst &&
                      (mobileDetailsBeforeWorkflow ? "order-2" : "order-3"),
                    isMobileWorkflowFirst && "md:order-none",
                  )}
                >
                  <CollapsibleContent
                    id="booking-detail-full-panel"
                    className={cn(
                      "space-y-5 overflow-hidden",
                      "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
                      "motion-reduce:animate-none",
                      "md:overflow-visible md:animate-none",
                    )}
                  >
                  <BookingHeader
                    booking={booking}
                    editMode={editMode}
                    onEdit={handleStartEdit}
                    onCancelEdit={() => setEditMode(false)}
                    onPayParking={handleOpenPayParking}
                    className={cn(isMobileWorkflowFirst && "hidden md:block")}
                  />

                  {editMode ? (
                    <BookingEditForm
                      booking={booking}
                      onClose={() => setEditMode(false)}
                      onSaved={() => setEditMode(false)}
                      onPreview={handlePreview}
                    />
                  ) : (
                    <>
                      <GuestInfoCard
                        booking={booking}
                        onPreview={handlePreview}
                      />
                      <GuestsCard
                        booking={booking}
                        onPreview={handlePreview}
                        isDocumentAiBackfilling={isReceiptAiBackfilling}
                      />
                      <StayDetailsCard booking={booking} />
                      <PricingSummaryCard
                        booking={booking}
                        onPreview={handlePreview}
                        isReceiptAiBackfilling={isReceiptAiBackfilling}
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
                      <OtherInfoCard booking={booking} />
                      <DocumentsCard
                        booking={booking}
                        onPreview={handlePreview}
                      />
                    </>
                  )}

                  {isMobileWorkflowFirst && (
                    <BookingMetaCard
                      booking={booking}
                      onCopyBookingId={() => void copyBookingIdToClipboard()}
                      className="md:hidden"
                    />
                  )}
                  </CollapsibleContent>
                </Collapsible>

                {/* ── Workflow / Progress (before fold on mobile when past review) ── */}
                <div
                  className={cn(
                    "w-full md:w-[min(100%,20rem)] md:shrink-0 lg:w-[min(100%,22.5rem)] xl:w-[370px]",
                    isMobileWorkflowFirst &&
                      (mobileDetailsBeforeWorkflow ? "order-3" : "order-2"),
                    isMobileWorkflowFirst && "md:order-none",
                  )}
                >
                  <PendingReviewWorkflowGate booking={booking}>
                    <WorkflowPanel key={booking.id} booking={booking} />
                  </PendingReviewWorkflowGate>

                  <BookingMetaCard
                    booking={booking}
                    onCopyBookingId={() => void copyBookingIdToClipboard()}
                    className={cn(
                      "mt-3",
                      isMobileWorkflowFirst && "hidden md:block",
                    )}
                  />
                </div>
              </div>
            </>
          )}
      </div>
      <AssetPreviewModal
        asset={previewAsset}
        booking={booking}
        isReceiptAiBackfilling={isReceiptAiBackfilling}
        loading={previewLoading}
        onClose={() => {
          if (!previewLoading) setPreviewAsset(null);
        }}
      />
      {booking && (
        <PayParkingModal
          booking={booking}
          open={payParkingModalOpen}
          onOpenChange={setPayParkingModalOpen}
        />
      )}
    </AdminLayout>
  );
}

// ─── Sub-sections ──────────────────────────────────────────────────────────────

function BookingHeader({
  booking,
  editMode,
  onEdit,
  onCancelEdit,
  onPayParking,
  className,
}: {
  booking: BookingRow;
  editMode: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onPayParking: () => void;
  className?: string;
}) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const fb = booking.guest_facebook_name?.trim() ?? "";
  const primary = booking.primary_guest_name?.trim() ?? "";
  const heading = fb || primary || "Booking";
  const showPrimarySubtitle = Boolean(
    fb && primary && fb.toLowerCase() !== primary.toLowerCase(),
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 space-y-2">
          <h1 className="text-base font-bold leading-snug text-foreground sm:text-[17px]">
            {heading}
          </h1>
          {showPrimarySubtitle && (
            <p className="text-ui font-medium text-muted-foreground">
              <span className="text-muted-foreground">Primary guest</span>{" "}
              <span className="text-muted-foreground">{primary}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ui text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Calendar
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0">
                {formatBookingDate(booking.check_in_date)} →{" "}
                {formatBookingDate(booking.check_out_date)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                {pax} pax · {booking.number_of_nights} night
                {booking.number_of_nights !== 1 ? "s" : ""}
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
          {!editMode && (
            <PayParkingHeaderButton
              booking={booking}
              onOpenModal={onPayParking}
              onViewParking={onPayParking}
            />
          )}
          {editMode ? (
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel and close the form"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/50"
            >
              <X className="size-3.5 shrink-0" aria-hidden />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/50"
            >
              <Edit2 className="size-3.5 shrink-0" aria-hidden />
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
          icon={<Mail className="size-3.5 text-muted-foreground" />}
        />
        <InfoField
          label="Phone"
          value={booking.guest_phone_number}
          icon={<Phone className="size-3.5 text-muted-foreground" />}
        />
        <InfoField
          label="Address"
          value={booking.guest_address}
          icon={<MapPin className="size-3.5 text-muted-foreground" />}
        />
        <InfoField label="Nationality" value={booking.nationality} />
      </Grid2>
      {booking.approved_gaf_pdf_url && (
        <div className="mt-3 flex flex-wrap gap-3">
          <DocPreview
            label="Approved GAF"
            url={booking.approved_gaf_pdf_url}
            onPreview={onPreview}
          />
        </div>
      )}
    </Card>
  );
}

function GuestsCard({
  booking,
  onPreview,
  isDocumentAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
  isDocumentAiBackfilling?: boolean;
}) {
  const visibleSlots = ADMIN_GUEST_VIEW_SLOTS.filter((slot) =>
    shouldShowAdminGuestViewSlot(slot, booking),
  );

  return (
    <Card title="Guests" icon={<Users className="size-3.5" />}>
      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const name = booking[slot.nameKey];
          const age = booking[slot.ageKey];
          const validIdUrl = booking[slot.validIdUrlKey];
          const showValidId =
            age != null && !Number.isNaN(age) && requiresValidId(age);

          return (
            <section
              key={slot.index}
              className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="size-4" aria-hidden />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                  {slot.index}. {slot.label} Guest
                </p>
              </div>
              <Grid2>
                <InfoField label="Name" value={name} />
                <InfoField
                  label="Age"
                  value={age != null ? String(age) : undefined}
                />
              </Grid2>
              {showValidId && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {validIdUrl ? (
                    <DocPreview
                      label={`${slot.label} Valid ID`}
                      url={validIdUrl}
                      onPreview={onPreview}
                      receiptAiVerdict={
                        slot.validIdAiVerdictKey
                          ? booking[slot.validIdAiVerdictKey]
                          : undefined
                      }
                      receiptAiLoading={
                        slot.validIdAiVerdictKey
                          ? receiptAiPreviewLoading(
                              isDocumentAiBackfilling,
                              validIdUrl,
                              booking[slot.validIdAiVerdictKey],
                            )
                          : false
                      }
                      receiptAiVariant="valid_id"
                    />
                  ) : (
                    <div className="flex min-h-[44px] items-center rounded-xl border border-dashed border-border/70 bg-card/80 px-3 text-xs text-muted-foreground">
                      No valid ID uploaded
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
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
          value={formatBookingDateTime(
            booking.check_in_date,
            booking.check_in_time,
            true,
          )}
        />
        <InfoField
          label="Check-out"
          value={formatBookingDateTime(
            booking.check_out_date,
            booking.check_out_time,
            false,
          )}
        />
        <InfoField
          label="Duration"
          value={`${booking.number_of_nights} night${booking.number_of_nights !== 1 ? "s" : ""}`}
        />
        <InfoField
          label="Guests"
          value={`${booking.number_of_adults ?? 0} adult${(booking.number_of_adults ?? 0) !== 1 ? "s" : ""}${booking.number_of_children ? `, ${booking.number_of_children} child${booking.number_of_children !== 1 ? "ren" : ""}` : ""} (${pax} pax)`}
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
            .join(" · ")}
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
            label="Owner Parking Rate"
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
  const source = booking.booking_source || "Facebook";
  const isAirbnb = source === "Airbnb";
  return (
    <Card title="Other Information" icon={<Info className="size-3.5" />}>
      {/* Booking Source */}
      <div className="mb-3">
        <p className="mb-1 text-overline">
          Booking Source
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium ${
            isAirbnb
              ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300"
              : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
          }`}
        >
          {source}
        </span>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-overline">
          Surprise decor
        </p>
        <span
          className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${
            booking.guest_requests_surprise_decor
              ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {booking.guest_requests_surprise_decor
            ? "Requested"
            : "Not requested"}
        </span>
      </div>

      {(booking.find_us || booking.find_us_details) && (
        <div className="mb-3">
          <p className="mb-1 text-overline">
            How they found us
          </p>
          <div className="flex flex-wrap gap-2">
            {booking.find_us && (
              <span className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1 text-xs text-foreground">
                <Search className="size-3 text-muted-foreground" />
                {booking.find_us}
              </span>
            )}
            {booking.find_us_details && (
              <span className="text-xs text-muted-foreground py-1">
                {booking.find_us_details}
              </span>
            )}
          </div>
        </div>
      )}
      {booking.guest_special_requests && (
        <div>
          <p className="mb-1 text-overline">
            Special Requests
          </p>
          <p className="flex items-start gap-2 text-sm text-foreground">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {booking.guest_special_requests}
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Post-review pricing + payment proof; on COMPLETED, adds SD refund settlement fields.
 * Hidden while status is PENDING_REVIEW (rates captured on first workflow transition).
 */
function PricingSummaryCard({
  booking,
  onPreview,
  isReceiptAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void;
  isReceiptAiBackfilling?: boolean;
}) {
  if (booking.status === "PENDING_REVIEW") return null;

  const isCompleted = booking.status === "COMPLETED";
  const hasPaymentReceipt = Boolean(booking.payment_receipt_url?.trim());
  const hasBalanceReceipt = Boolean(
    booking.guest_balance_payment_receipt_url?.trim(),
  );

  return (
    <Card title="Pricing" icon={<Banknote className="size-3.5" />}>
      <BookingPricingSummary booking={booking} layout="page" />

      {(hasPaymentReceipt || hasBalanceReceipt) && (
        <div className="mt-4">
          <p className="mb-2 text-overline">
            Payment receipts
          </p>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            {hasPaymentReceipt && (
              <DocPreview
                label="Downpayment receipt"
                url={booking.payment_receipt_url!.trim()}
                onPreview={onPreview}
                receiptAiVerdict={booking.dp_receipt_ai_verdict}
                receiptAiLoading={receiptAiPreviewLoading(
                  isReceiptAiBackfilling,
                  booking.payment_receipt_url,
                  booking.dp_receipt_ai_verdict,
                )}
              />
            )}
            {hasBalanceReceipt && (
              <DocPreview
                label="Payment balance receipt"
                url={booking.guest_balance_payment_receipt_url!.trim()}
                onPreview={onPreview}
                receiptAiVerdict={booking.balance_receipt_ai_verdict}
                receiptAiLoading={receiptAiPreviewLoading(
                  isReceiptAiBackfilling,
                  booking.guest_balance_payment_receipt_url,
                  booking.balance_receipt_ai_verdict,
                )}
              />
            )}
          </div>
        </div>
      )}

      {isCompleted && booking.next_stay_voucher_code && (
        <NextStayVoucherCard booking={booking} />
      )}

      {isCompleted && booking.sd_refund_receipt_url && (
        <div className="mt-4 border-t border-separator pt-4">
          <p className="mb-2 text-overline">
            Refund receipt
          </p>
          <DocPreview
            label="SD refund receipt"
            url={booking.sd_refund_receipt_url}
            onPreview={onPreview}
          />
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
      : typeof amountRaw === "string"
        ? Number(amountRaw)
        : amountRaw;
  const awardedAt = booking.next_stay_voucher_awarded_at;

  return (
    <div className="mt-4 border-t border-separator pt-4">
      <p className="mb-2 text-overline">
        Next-stay voucher
      </p>
      <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 px-4 py-3 ring-1 ring-emerald-100/80 dark:border-emerald-500/30 dark:from-emerald-950/50 dark:via-card dark:to-emerald-900/25 dark:ring-emerald-500/20">
        <Sparkles
          className="absolute right-3 top-3 size-4 text-emerald-500/70 dark:text-emerald-400/80"
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            <Ticket className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-emerald-950 dark:text-emerald-100 sm:text-base">
              {code}
            </p>
            <p className="mt-0.5 text-caption text-emerald-900/70 dark:text-emerald-200/80">
              {isStaycationVoucher({ code })
                ? 'Free staycation on the next booking'
                : amount != null
                  ? `${formatMoney(amount)} off the next booking`
                  : '—'}
              {awardedAt && (
                <>
                  {" · "}
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
  const docs = [{ label: "Booking PDF", url: booking.pdf_url }].filter(
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

function getDocType(url: string): "image" | "pdf" | "file" {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|heic|heif)$/.test(path)) return "image";
  if (/\.pdf$/.test(path)) return "pdf";
  return "file";
}

function docPreviewOuterWidth() {
  return "min-w-0 w-full max-w-full lg:max-w-[255px]";
}

function docPreviewLabelRow(
  label: string,
  icon: ReactNode,
  receiptAiVerdict?: ReceiptAiVerdict,
  receiptAiLoading?: boolean,
  receiptAiVariant: DocumentAiVerdictVariant = "receipt",
) {
  return (
    <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-caption font-medium">
      {icon}
      <span className="truncate">{label}</span>
      {receiptAiLoading ? (
        <Loader2
          className="size-3 shrink-0 animate-spin text-muted-foreground"
          aria-label={receiptAiVariant === "valid_id" ? "Checking valid ID" : "Checking receipt"}
        />
      ) : receiptAiVerdict &&
        String(receiptAiVerdict).toLowerCase() !== 'skipped' ? (
        <ReceiptAiVerdictBadge
          verdict={receiptAiVerdict}
          compact
          className="shrink-0"
          variant={receiptAiVariant}
        />
      ) : null}
    </span>
  );
}

function DocPreview({
  label,
  url,
  onPreview,
  receiptAiVerdict,
  receiptAiLoading = false,
  receiptAiVariant = "receipt",
}: {
  label: string;
  url: string;
  onPreview: (label: string, rawUrl: string) => void;
  receiptAiVerdict?: ReceiptAiVerdict;
  receiptAiLoading?: boolean;
  receiptAiVariant?: DocumentAiVerdictVariant;
}) {
  const normalized = normalizeStoragePublicUrl(url) ?? url;
  const parsed = parseStorageUrl(normalized);
  const inPrivateBucket = Boolean(
    parsed && PRIVATE_STORAGE_BUCKETS.has(parsed.bucket),
  );
  const layoutType = getDocType(normalized);
  /** Only private buckets need a signed URL from the edge function. */
  const needsSignedUrl = inPrivateBucket;
  const [displayUrl, setDisplayUrl] = useState<string | null>(() =>
    needsSignedUrl ? null : normalized,
  );
  const [imgError, setImgError] = useState(false);
  const [missingInStorage, setMissingInStorage] = useState(false);

  useEffect(() => {
    const n = normalizeStoragePublicUrl(url) ?? url;
    const loc = parseStorageUrl(n);
    const priv = Boolean(loc && PRIVATE_STORAGE_BUCKETS.has(loc.bucket));
    if (!priv) {
      setDisplayUrl(n);
      setImgError(false);
      setMissingInStorage(false);
      return;
    }
    let cancelled = false;
    setDisplayUrl(null);
    setImgError(false);
    setMissingInStorage(false);
    resolveAssetUrlForBrowser(url)
      .then((u) => {
        if (!cancelled) setDisplayUrl(u);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isStorageObjectNotFoundError(err)) {
          setDisplayUrl(null);
          setMissingInStorage(true);
          setImgError(true);
          return;
        }
        setDisplayUrl(n);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const hrefForOpen = displayUrl ?? normalized;

  if (needsSignedUrl && !displayUrl && !missingInStorage) {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card ${docPreviewOuterWidth()}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-muted">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {docPreviewLabelRow(
            label,
            <ImageIcon className="size-3 shrink-0 text-muted-foreground" />,
            receiptAiVerdict,
            receiptAiLoading,
            receiptAiVariant,
          )}
        </div>
      </div>
    );
  }

  if (missingInStorage) {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 ${docPreviewOuterWidth()}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-muted px-3 text-center">
          <p className="text-[11px] leading-snug text-muted-foreground">
            File missing from storage
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card">
          {docPreviewLabelRow(
            label,
            layoutType === "pdf" ? (
              <FileText className="size-3 shrink-0 text-rose-500" />
            ) : (
              <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
            ),
            receiptAiVerdict,
            receiptAiLoading,
            receiptAiVariant,
          )}
        </div>
      </div>
    );
  }

  if (layoutType === "image" && imgError) {
    return (
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 ${docPreviewOuterWidth()}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-muted px-3 text-center">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Preview unavailable
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card">
          {docPreviewLabelRow(
            label,
            <ImageIcon className="size-3 shrink-0 text-muted-foreground" />,
            receiptAiVerdict,
            receiptAiLoading,
            receiptAiVariant,
          )}
        </div>
      </div>
    );
  }

  if (layoutType === "image" && !imgError) {
    return (
      <a
        href={hrefForOpen}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onPreview(label, url);
        }}
        className={`group flex flex-col overflow-hidden rounded-xl border border-border transition-all hover:border-blue-300 hover:shadow-md ${docPreviewOuterWidth()}`}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card">
          {docPreviewLabelRow(
            label,
            <ImageIcon className="size-3 shrink-0 text-muted-foreground" />,
            receiptAiVerdict,
            receiptAiLoading,
            receiptAiVariant,
          )}
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
        </div>
      </a>
    );
  }

  if (layoutType === "pdf") {
    return (
      <a
        href={hrefForOpen}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          onPreview(label, url);
        }}
        className={`group flex flex-col overflow-hidden rounded-xl border border-border transition-all hover:border-blue-300 hover:shadow-md ${docPreviewOuterWidth()}`}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-rose-100">
            <FileText className="size-10 text-rose-500" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <ExternalLink className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-card">
          <span className="inline-flex truncate items-center gap-1 text-caption font-medium">
            <FileText className="size-3 shrink-0 text-rose-500" />
            <span className="truncate">{label}</span>
          </span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
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
      className={`flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-muted ${docPreviewOuterWidth()}`}
    >
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs font-medium text-foreground">
        {label}
      </span>
    </a>
  );
}

/** Modal shell height — shared by image + PDF preview bodies. */
const ASSET_PREVIEW_MODAL_H =
  "h-[min(90dvh,calc(100dvh-1.5rem))] max-h-[min(90dvh,calc(100dvh-1.5rem))]";

/** PDF iframe fills the scrollable body below the header. */
const ASSET_PREVIEW_PDF_H = "h-full min-h-[min(50dvh,20rem)]";

function receiptAiMetaForPreviewAsset(
  booking: BookingRow | null | undefined,
  asset: { label: string; rawUrl: string } | null,
  isBackfilling: boolean,
): {
  verdict: ReceiptAiVerdict;
  loading: boolean;
  variant: DocumentAiVerdictVariant;
} | null {
  if (!booking || !asset) return null;

  const raw = asset.rawUrl.trim();
  const matches = (stored: string | null | undefined) =>
    Boolean(stored?.trim() && stored.trim() === raw);

  if (
    asset.label === "Downpayment receipt" ||
    matches(booking.payment_receipt_url)
  ) {
    return {
      verdict: booking.dp_receipt_ai_verdict,
      loading: receiptAiPreviewLoading(
        isBackfilling,
        booking.payment_receipt_url,
        booking.dp_receipt_ai_verdict,
      ),
      variant: "receipt",
    };
  }

  if (
    asset.label === "Payment balance receipt" ||
    matches(booking.guest_balance_payment_receipt_url)
  ) {
    return {
      verdict: booking.balance_receipt_ai_verdict,
      loading: receiptAiPreviewLoading(
        isBackfilling,
        booking.guest_balance_payment_receipt_url,
        booking.balance_receipt_ai_verdict,
      ),
      variant: "receipt",
    };
  }

  if (
    asset.label === "Parking Payment Receipt" ||
    asset.label === "Parking payment receipt" ||
    matches(booking.parking_payment_receipt_url)
  ) {
    return {
      verdict: booking.parking_receipt_ai_verdict,
      loading: receiptAiPreviewLoading(
        isBackfilling,
        booking.parking_payment_receipt_url,
        booking.parking_receipt_ai_verdict,
      ),
      variant: "receipt",
    };
  }

  if (
    asset.label === "Valid ID" ||
    matches(booking.valid_id_url)
  ) {
    return {
      verdict: booking.valid_id_ai_verdict,
      loading: receiptAiPreviewLoading(
        isBackfilling,
        booking.valid_id_url,
        booking.valid_id_ai_verdict,
      ),
      variant: "valid_id",
    };
  }

  return null;
}

function AssetPreviewModal({
  asset,
  booking,
  isReceiptAiBackfilling,
  loading,
  onClose,
}: {
  asset: {
    label: string;
    url: string;
    rawUrl: string;
    type: "image" | "pdf" | "file";
  } | null;
  booking: BookingRow | null | undefined;
  isReceiptAiBackfilling: boolean;
  loading: boolean;
  onClose: () => void;
}) {
  const open = Boolean(asset || loading);
  const receiptAi = receiptAiMetaForPreviewAsset(
    booking,
    asset,
    isReceiptAiBackfilling,
  );

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background/80 backdrop-blur-[1px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={asset ? `Preview ${asset.label}` : "Loading preview"}
      onClick={onClose}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[min(calc(100vw-1.5rem),56rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
          ASSET_PREVIEW_MODAL_H,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 min-h-[52px] items-center justify-between gap-2 border-b border-separator px-2.5 sm:min-h-[56px] sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
              {asset?.label ?? "Loading preview..."}
            </p>
            {receiptAi?.loading ? (
              <Loader2
                className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                aria-label="Checking receipt"
              />
            ) : receiptAi?.verdict &&
              String(receiptAi.verdict).toLowerCase() !== "skipped" ? (
              <ReceiptAiVerdictBadge
                verdict={receiptAi.verdict}
                compact
                className="shrink-0"
                variant={receiptAi.variant}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {asset && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-border px-2 text-ui font-medium hover:bg-muted/50 sm:min-h-[44px] sm:px-3"
              >
                Open in new tab
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 sm:min-h-[44px] sm:min-w-[44px]"
              aria-label="Close preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain bg-muted p-1.5 sm:min-h-[12rem] sm:p-3">
          {loading && (
            <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          )}

          {!loading && asset?.type === "image" && (
            <div className="flex h-full min-h-0 w-full items-center justify-center rounded-lg bg-card p-2">
              <img
                src={asset.url}
                alt={asset.label}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {!loading && asset?.type !== "image" && asset && (
            <iframe
              title={asset.label}
              src={asset.url}
              className={cn(
                "w-full rounded-lg bg-card",
                ASSET_PREVIEW_PDF_H,
              )}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-overline">
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
  if (value === null || value === undefined || value === "" || value === "—")
    return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-overline">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-foreground">
        {icon}
        {String(value)}
      </span>
    </div>
  );
}
