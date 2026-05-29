/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * Two-column layout on lg+:
 *   Left (flexible): all booking info cards + document previews
 *   Right (sticky 344px): WorkflowPanel
 *
 * Mobile (<lg): compact summary + expand control; Progress (WorkflowPanel) next;
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { BookingDetailMobileSummary } from "@/features/admin/components/BookingDetailMobileSummary";
import { BookingMetaCard } from "@/features/admin/components/BookingMetaCard";
import { PendingReviewWorkflowGate } from "@/features/admin/components/PendingReviewWorkflowGate";
import { WorkflowPanel } from "@/features/admin/components/WorkflowPanel";
import { BookingEditForm } from "@/features/admin/components/BookingEditForm";
import { useIsBelowLg } from "@/hooks/useMediaQuery";
import { useBooking } from "@/features/admin/hooks/useBooking";
import {
  formatBookingDate,
  formatBookingDateTime,
  formatMoney,
  formatRelative,
} from "@/features/admin/lib/formatters";
import type {
  BookingRow,
  SdSettlementLineItem,
} from "@/features/admin/lib/types";
import {
  normalizeStoragePublicUrl,
  parseStorageUrl,
  PRIVATE_STORAGE_BUCKETS,
  resolveAssetUrlForBrowser,
} from "@/features/admin/lib/storageUrls";
import {
  computeCompletedStayProfitLoss,
  computeTotalGuestBalance,
  guestBalancePaidRecorded,
} from "@/features/admin/lib/totalGuestBalance";
import {
  PayParkingHeaderButton,
  PayParkingModal,
} from "@/features/admin/components/PayParkingModal";
import { buildPayParkingPath } from "@/features/pay-parking/lib/api";
import { hasPayParkingAvailed } from "@/features/pay-parking/lib/payParkingHelpers";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const [editMode, setEditMode] = useState(false);
  const [payParkingModalOpen, setPayParkingModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{
    label: string;
    url: string;
    type: "image" | "pdf" | "file";
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  const isBelowLg = useIsBelowLg();

  const scrollDetailsIntoView = useCallback(() => {
    // Wait for panel to un-hide and re-order in the layout before scrolling.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        detailsPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

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
  const isMobileWorkflowFirst = isBelowLg && booking != null;

  const showMobileDetailCards =
    !isMobileWorkflowFirst || detailsExpanded || editMode;

  /** Expanded details sit between summary and Progress on mobile (not below the fold). */
  const mobileDetailsBeforeWorkflow =
    isMobileWorkflowFirst && showMobileDetailCards;

  useEffect(() => {
    if (!isMobileWorkflowFirst || !showMobileDetailCards) return;
    const timer = window.setTimeout(() => scrollDetailsIntoView(), 400);
    return () => window.clearTimeout(timer);
  }, [isMobileWorkflowFirst, showMobileDetailCards, scrollDetailsIntoView]);

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
        type: getDocType(resolved),
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open document",
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
          {isLoading && <LoadingSkeleton />}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                {isMobileWorkflowFirst && (
                  <BookingDetailMobileSummary
                    className="order-1 lg:hidden"
                    booking={booking}
                    detailsExpanded={detailsExpanded}
                    onToggleDetails={handleToggleDetails}
                    onPayParking={handleOpenPayParking}
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
                    isMobileWorkflowFirst && "lg:order-none",
                  )}
                >
                  <CollapsibleContent
                    ref={detailsPanelRef}
                    id="booking-detail-full-panel"
                    className={cn(
                      "space-y-5 overflow-hidden",
                      "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
                      "motion-reduce:animate-none",
                      "lg:overflow-visible lg:animate-none",
                    )}
                  >
                  <BookingHeader
                    booking={booking}
                    editMode={editMode}
                    onEdit={handleStartEdit}
                    onCancelEdit={() => setEditMode(false)}
                    onPayParking={handleOpenPayParking}
                  />

                  {editMode ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5">
                      <h2 className="mb-4 text-sm font-bold text-foreground">
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
                      className="lg:hidden"
                    />
                  )}
                  </CollapsibleContent>
                </Collapsible>

                {/* ── Workflow / Progress (before fold on mobile when past review) ── */}
                <div
                  className={cn(
                    "w-full lg:w-[370px] lg:shrink-0 lg:sticky lg:top-[58px]",
                    isMobileWorkflowFirst &&
                      (mobileDetailsBeforeWorkflow ? "order-3" : "order-2"),
                    isMobileWorkflowFirst && "lg:order-none",
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
                      isMobileWorkflowFirst && "hidden lg:block",
                    )}
                  />
                </div>
              </div>
            </>
          )}
      </div>
      <AssetPreviewModal
        asset={previewAsset}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 max-w-full break-words text-base font-bold leading-snug text-foreground sm:text-[17px]">
              {heading}
            </h1>
          </div>
          {showPrimarySubtitle && (
            <p className="text-ui font-medium text-muted-foreground">
              <span className="text-muted-foreground">Primary guest</span>{" "}
              <span className="text-muted-foreground">{primary}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ui text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>
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
        <div className="flex w-full shrink-0 flex-wrap items-start justify-stretch gap-2 sm:w-auto sm:justify-end">
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
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/50 sm:flex-initial sm:px-4"
            >
              <X className="size-3.5 shrink-0" aria-hidden />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/50 sm:flex-initial sm:px-4"
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
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground"
          >
            <User className="size-3 text-muted-foreground" />
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
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            isAirbnb
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
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
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
            booking.guest_requests_surprise_decor
              ? "border-violet-200 bg-violet-50 text-violet-800"
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
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground">
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

const SD_REFUND_METHOD_LABELS: Record<string, string> = {
  same_phone: "Refund to same phone (GCash)",
  other_bank: "Bank transfer",
  cash: "Cash pickup",
};

function parseSdNumberArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  }
  if (typeof raw === "string" && raw.trim()) {
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
  if (typeof raw === "string" && raw.trim()) {
    try {
      arr = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((row) => {
    if (typeof row !== "object" || row === null) {
      return { label: "", amount: 0 };
    }
    const r = row as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label : "";
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
  if (booking.status === "PENDING_REVIEW") return null;

  const isCompleted = booking.status === "COMPLETED";
  const totalGuestBalance = computeTotalGuestBalance(booking);
  const paidTowardBalance = guestBalancePaidRecorded(booking);
  const unpaidCents =
    totalGuestBalance != null
      ? Math.round(totalGuestBalance * 100) -
        Math.round(paidTowardBalance * 100)
      : null;
  const { expenses: sdExpenses, profits: sdProfits } =
    buildSdExpenseProfitRows(booking);

  const { totalProfit, totalExpenses, totalNet } = isCompleted
    ? computeCompletedStayProfitLoss(booking, sdProfits, sdExpenses)
    : { totalProfit: 0, totalExpenses: 0, totalNet: 0 };

  const hasPaymentReceipt = Boolean(booking.payment_receipt_url?.trim());
  const hasBalanceReceipt = Boolean(
    booking.guest_balance_payment_receipt_url?.trim(),
  );

  return (
    <Card title="Pricing" icon={<Banknote className="size-3.5" />}>
      <p className="mb-2 text-overline">
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
          value={
            booking.has_pets === true
              ? formatMoney(booking.pet_fee as number)
              : '—'
          }
        />
        <InfoField
          label="Parking fee (guest)"
          value={
            booking.need_parking === true
              ? formatMoney(booking.parking_rate_guest as number)
              : '—'
          }
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
        <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200">
          {/* Guest settlement */}
          <p className="bg-muted/50 px-4 py-1.5 text-overline">
            Guest settlement
          </p>
          <div className="divide-y divide-slate-100 bg-card">
            <MiniRow
              label="Total guest balance"
              value={formatMoney(totalGuestBalance)}
            />
            <MiniRow
              label="Balance paid"
              value={
                paidTowardBalance > 0 ? formatMoney(paidTowardBalance) : "—"
              }
            />
            <MiniRow label="Unpaid">
              {unpaidCents !== null && unpaidCents <= 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <CheckCircle2
                    className="size-3 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  Paid in full
                </span>
              ) : (
                <span className="text-data-primary tabular-nums text-amber-800">
                  {unpaidCents != null ? formatMoney(unpaidCents / 100) : "—"}
                </span>
              )}
            </MiniRow>
          </div>

          {/* P&L — COMPLETED only */}
          {isCompleted && (
            <div className="border-t border-border">
              <p className="bg-muted/50 px-4 py-1.5 text-overline">
                Profit &amp; loss
              </p>
              <div className="divide-y divide-slate-100 bg-card">
                <MiniRow
                  label="Profit"
                  value={formatMoney(totalProfit)}
                  valueClass={
                    totalProfit >= 0 ? "text-emerald-700" : "text-red-600"
                  }
                />
                <MiniRow label="Expenses" value={formatMoney(totalExpenses)} />
                <MiniRow
                  label="Net"
                  bold
                  value={formatMoney(totalNet)}
                  valueClass={
                    totalNet > 0
                      ? "text-emerald-700"
                      : totalNet < 0
                        ? "text-red-600"
                        : "text-foreground"
                  }
                />
              </div>
            </div>
          )}

          {unpaidCents !== null && unpaidCents < 0 && (
            <p className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
              Overpaid by {formatMoney(Math.abs(unpaidCents) / 100)}
            </p>
          )}
        </div>
      )}

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
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="mb-2 text-overline">
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
                  ? "Yes"
                  : booking.sd_refund_phone_confirmed === false
                    ? "No"
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
              <p className="mb-1.5 text-overline">
                Additional SD expenses
              </p>
              <ul className="space-y-1 rounded-lg border border-border bg-muted/50/80 px-3 py-2">
                {sdExpenses.map((row, i) => (
                  <li
                    key={`e-${i}`}
                    className="flex justify-between gap-2 text-xs text-foreground"
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
              <p className="mb-1.5 text-overline">
                Additional SD profits
              </p>
              <ul className="space-y-1 rounded-lg border border-border bg-muted/50/80 px-3 py-2">
                {sdProfits.map((row, i) => (
                  <li
                    key={`p-${i}`}
                    className="flex justify-between gap-2 text-xs text-foreground"
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
    <div className="mt-4 border-t border-border/60 pt-4">
      <p className="mb-2 text-overline">
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
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-foreground sm:text-base">
              {code}
            </p>
            <p className="mt-0.5 text-caption">
              {amount != null ? formatMoney(amount) : "—"} off the next booking
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
    inPrivateBucket || layoutType === "image" || layoutType === "pdf";
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const n = normalizeStoragePublicUrl(url) ?? url;
    const loc = parseStorageUrl(n);
    const priv = Boolean(loc && PRIVATE_STORAGE_BUCKETS.has(loc.bucket));
    const t = getDocType(n);
    if (!priv && t === "file") {
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
        className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card ${docPreviewOuterWidth()}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-muted">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="truncate text-caption font-medium">
            {label}
          </span>
        </div>
      </div>
    );
  }

  if (layoutType === "image" && imgError) {
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
        <div className="flex items-center justify-between px-3 py-2 bg-card">
          <span className="inline-flex truncate items-center gap-1 text-caption font-medium">
            <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
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

/** Preview body height — PDF iframes need an explicit min-height; images fill naturally. */
const ASSET_PREVIEW_BODY_MIN_H =
  "min-h-[min(78dvh,calc(100dvh-8.5rem))]";

function AssetPreviewModal({
  asset,
  loading,
  onClose,
}: {
  asset: { label: string; url: string; type: "image" | "pdf" | "file" } | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!asset && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-[1px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={asset ? `Preview ${asset.label}` : "Loading preview"}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full max-w-[min(calc(100vw-1.5rem),56rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-[52px] items-center justify-between border-b border-border px-2.5 sm:min-h-[56px] sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
              {asset?.label ?? "Loading preview..."}
            </p>
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
        <div
          className={cn(
            "flex-1 bg-muted p-1.5 sm:p-3",
            ASSET_PREVIEW_BODY_MIN_H,
          )}
        >
          {loading && (
            <div className="flex h-full min-h-[inherit] items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          )}

          {!loading && asset?.type === "image" && (
            <div
              className={cn(
                "flex h-full items-center justify-center overflow-auto rounded-lg bg-card",
                ASSET_PREVIEW_BODY_MIN_H,
              )}
            >
              <img
                src={asset.url}
                alt={asset.label}
                className="max-h-full w-auto object-contain"
              />
            </div>
          )}

          {!loading && asset?.type !== "image" && asset && (
            <iframe
              title={asset.label}
              src={asset.url}
              className={cn(
                "h-full w-full rounded-lg bg-card",
                ASSET_PREVIEW_BODY_MIN_H,
              )}
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

/** Compact 2-col key/value row for the settlement + P&L block. */
function MiniRow({
  label,
  value,
  valueClass,
  bold,
  children,
}: {
  label: string;
  value?: string;
  valueClass?: string;
  bold?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span
        className={`text-xs uppercase tracking-wider ${bold ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}
      >
        {label}
      </span>
      {children ?? (
        <span
          className={`text-data-primary tabular-nums ${bold ? "font-bold" : "font-semibold"} ${valueClass ?? "text-foreground"}`}
        >
          {value}
        </span>
      )}
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

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="hidden lg:block w-80 h-64 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
