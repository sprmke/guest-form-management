/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * View mode: one `BookingDetailShell` (header + tabs + panels) matching edit chrome
 * (AI Summary? / Stay / Guests / Parking? / Pets? / Pricing? / Files).
 * Edit mode: `BookingEditForm` / `BookingEditTabs` — same shell; Stay / Guests / Parking / Pets.
 *
 * Mobile: compact summary strip; Progress stays above the fold; detail panels collapse.
 *
 * Right rail is `lg:sticky` so Progress stays visible while the left column scrolls, and the
 * booking refetches on a 60s interval (visibility-gated) so server-side/cron-driven transitions
 * surface without a manual refresh — see `.claude/skills/admin-dashboard/SKILL.md`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams, Link, useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { buildPayParkingPath } from '@/features/guest/pay-parking/lib/api';
import { hasPayParkingAvailed } from '@/features/guest/pay-parking/lib/payParkingHelpers';

import { BookingAiAssistantAuditCard } from '@/features/dashboard/ai-assistant/components/BookingAiAssistantAuditCard';
import { BookingDetailAssetPreviewModal } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal';
import { BookingDetailHeader } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailHeader';
import {
  BookingDetailTabs,
  type BookingViewTab,
} from '@/features/dashboard/bookings/components/booking-detail/BookingDetailTabs';
import type { BookingEditTabId } from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs';
import { AiSummaryPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/AiSummaryPanel';
import { DocumentsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/DocumentsPanel';
import { GuestsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/GuestsPanel';
import { OtherInfoPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/OtherInfoPanel';
import { ParkingPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/ParkingPanel';
import { PetsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/PetsPanel';
import { PricingSummaryPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/PricingSummaryPanel';
import { StayDetailsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/StayDetailsPanel';
import {
  BookingDetailShell,
  BookingDetailShellBody,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailShell';
import { BookingDetailMobileSummary } from '@/features/dashboard/bookings/components/BookingDetailMobileSummary';
import { BookingEditForm } from '@/features/dashboard/bookings/components/BookingEditForm';
import { BookingMetaCard } from '@/features/dashboard/bookings/components/BookingMetaCard';
import { PayParkingModal } from '@/features/dashboard/bookings/components/PayParkingModal';
import { WorkflowPanel } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPanel';
import { bookingDetailQueryKey, useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import {
  invalidateBookingAiReviewQueries,
  useBookingAiReview,
} from '@/features/dashboard/bookings/hooks/useBookingAiReview';
import { useBookingAssetPreview } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { useBookingParkingShareLink } from '@/features/dashboard/bookings/hooks/useBookingParkingShareLink';
import { useBookingStayGuideLink } from '@/features/dashboard/bookings/hooks/useBookingStayGuideLink';
import { hasBookingAiReviewRun } from '@/features/dashboard/bookings/lib/bookingAiReviewProgress';
import { buildBookingDetailActions } from '@/features/dashboard/bookings/lib/bookingDetailActions';
import { resolveBookingViewTab } from '@/features/dashboard/bookings/lib/resolveBookingViewTab';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import {
  bookingEditableTabs,
  BOOKING_EDIT_TAB_PERMISSION,
  hasPropertyPermission,
} from '@/features/dashboard/team/lib/propertyPermissions';

import { BookingDetailPageSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { propertyDashboardPageTitle, usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

/** Server-side/cron-driven transitions land without a manual refresh — poll while this page is open. */
const AUTO_REFRESH_INTERVAL_MS = 60_000;

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { property, propertySlug } = useOrgContext();
  const propertyId = usePropertyIdParam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const {
    data: aiReview,
    isSuccess: aiReviewLoaded,
    isError: aiReviewFailed,
  } = useBookingAiReview(bookingId);
  const hasAiSummaryRun = hasBookingAiReviewRun(aiReview);
  const guestName = booking?.primary_guest_name || booking?.guest_facebook_name;
  usePageTitle(
    booking
      ? propertyDashboardPageTitle(
          property.name,
          guestName ? `Booking: ${guestName}` : `Booking ${booking.id.slice(0, 8)}`
        )
      : undefined
  );
  const { data: propertyAccess } = usePropertyPermissions();
  const editableTabs = bookingEditableTabs(propertyAccess?.permissions);
  const canEditBooking = editableTabs.length > 0;
  const canMutateWorkflow = hasPropertyPermission(
    propertyAccess?.permissions,
    'bookings.detail.workflow:edit'
  );
  const canEditStay = hasPropertyPermission(
    propertyAccess?.permissions,
    BOOKING_EDIT_TAB_PERMISSION.stay
  );
  const canEditParking = hasPropertyPermission(
    propertyAccess?.permissions,
    BOOKING_EDIT_TAB_PERMISSION.parking
  );
  const canEditPets = hasPropertyPermission(
    propertyAccess?.permissions,
    BOOKING_EDIT_TAB_PERMISSION.pets
  );
  const [editMode, setEditMode] = useState(false);
  const [editInitialTab, setEditInitialTab] = useState<BookingEditTabId | undefined>(undefined);
  const [payParkingModalOpen, setPayParkingModalOpen] = useState(false);
  const { previewAsset, previewLoading, handlePreview, closePreview } = useBookingAssetPreview();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [viewTab, setViewTab] = useState<BookingViewTab>('overview');
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const defaultTabAppliedFor = useRef<string | null>(null);
  const isBelowMd = useIsBelowMd();

  const copyBookingIdToClipboard = useCallback(async () => {
    const id = bookingId?.trim();
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [bookingId]);

  useEffect(() => {
    setDetailsExpanded(false);
    setEditMode(false);
    setEditInitialTab(undefined);
    setViewTab('overview');
    defaultTabAppliedFor.current = null;
  }, [bookingId]);

  /**
   * Landing tab per visit: AI Summary when a run exists, else Stay. Applied once per
   * booking (after the review query settles) so a later manual tab choice — or a run
   * finishing while the host reads another tab — never yanks them elsewhere.
   */
  useEffect(() => {
    if (!bookingId || !booking) return;
    if (defaultTabAppliedFor.current === bookingId) return;
    if (!aiReviewLoaded && !aiReviewFailed) return;
    defaultTabAppliedFor.current = bookingId;
    setViewTab(hasAiSummaryRun ? 'ai_summary' : 'overview');
  }, [bookingId, booking, aiReviewLoaded, aiReviewFailed, hasAiSummaryRun]);

  useEffect(() => {
    if (!booking) return;
    setViewTab((tab) => resolveBookingViewTab(tab, booking, { hasAiSummaryRun }));
  }, [booking, hasAiSummaryRun]);

  useEffect(() => {
    if (editMode) setDetailsExpanded(true);
  }, [editMode]);

  // Surfaces inbound approval / SD-refund-cron transitions without a manual refresh.
  useEffect(() => {
    if (!bookingId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void queryClient.invalidateQueries({
        queryKey: bookingDetailQueryKey(bookingId, propertyId),
      });
      void invalidateBookingAiReviewQueries(queryClient, bookingId);
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [bookingId, propertyId, queryClient]);

  /** Collapsed guest cards on mobile so Progress stays above the fold. */
  const isMobileWorkflowFirst = isBelowMd && booking != null;

  const showMobileDetailCards = !isMobileWorkflowFirst || detailsExpanded || editMode;

  /** Expanded details sit between summary and Progress on mobile (not below the fold). */
  const mobileDetailsBeforeWorkflow = isMobileWorkflowFirst && showMobileDetailCards;

  const handleToggleDetails = useCallback(() => {
    setDetailsExpanded((was) => !was);
  }, []);

  const handleStartEdit = useCallback(
    (tab?: BookingEditTabId) => {
      if (!canEditBooking) return;
      if (tab && !editableTabs.includes(tab)) return;
      setEditInitialTab(tab ?? editableTabs[0]);
      setEditMode(true);
    },
    [canEditBooking, editableTabs]
  );

  const handleCloseEdit = useCallback(() => {
    setEditMode(false);
    setEditInitialTab(undefined);
  }, []);

  const handleOpenPayParking = useCallback(() => {
    if (!booking) return;
    if (hasPayParkingAvailed(booking)) {
      navigate(buildPayParkingPath(propertySlug, booking.id, { admin: true }));
      return;
    }
    setPayParkingModalOpen(true);
  }, [booking, navigate, propertySlug]);

  const stayGuide = useBookingStayGuideLink(booking);
  const parkingShareLink = useBookingParkingShareLink(booking);

  const handleOpenAiSummary = useCallback(() => setAiSummaryOpen(true), []);

  const hostActions = useMemo(
    () =>
      booking
        ? buildBookingDetailActions({
            booking,
            onEdit: handleStartEdit,
            onPayParking: handleOpenPayParking,
            onOpenAiSummary: handleOpenAiSummary,
            stayGuide,
            parkingShareLink,
            canRunAiSummary: canEditStay,
            canEditParking,
            canEditPets,
            canManagePayParking: canEditParking,
          })
        : [],
    [
      booking,
      handleStartEdit,
      handleOpenPayParking,
      handleOpenAiSummary,
      stayGuide,
      parkingShareLink,
      canEditStay,
      canEditParking,
      canEditPets,
    ]
  );

  return (
    <>
      <div className="space-y-4">
        {/* Back nav */}
        <Link
          to="/bookings"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
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
          <div className="border-border bg-card text-muted-foreground rounded-xl border p-10 text-center text-sm">
            Booking not found.
          </div>
        )}

        {booking && (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5 lg:gap-6">
            {isMobileWorkflowFirst && (
              <BookingDetailMobileSummary
                className="order-1 md:hidden"
                booking={booking}
                detailsExpanded={detailsExpanded}
                onToggleDetails={handleToggleDetails}
                editMode={editMode}
                onEdit={canEditBooking ? () => handleStartEdit() : undefined}
                onCancelEdit={handleCloseEdit}
                actions={hostActions}
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
                'min-w-0 flex-1',
                isMobileWorkflowFirst && (mobileDetailsBeforeWorkflow ? 'order-2' : 'order-3'),
                isMobileWorkflowFirst && 'md:order-none'
              )}
            >
              <CollapsibleContent
                id="booking-detail-full-panel"
                className={cn(
                  'space-y-5 overflow-hidden',
                  'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                  'motion-reduce:animate-none',
                  'md:animate-none md:overflow-visible'
                )}
              >
                {editMode ? (
                  <BookingEditForm
                    key={`${booking.id}-${editInitialTab ?? 'guest'}`}
                    booking={booking}
                    initialTab={editInitialTab}
                    allowedTabs={editableTabs}
                    onClose={handleCloseEdit}
                    onSaved={handleCloseEdit}
                    onPreview={handlePreview}
                  />
                ) : (
                  <BookingDetailShell>
                    <BookingDetailHeader
                      booking={booking}
                      onEdit={() => handleStartEdit()}
                      canEdit={canEditBooking}
                      actions={hostActions}
                      className={cn(isMobileWorkflowFirst && 'hidden md:block')}
                    />

                    <BookingDetailShellBody>
                      <BookingDetailTabs value={viewTab} onChange={setViewTab} booking={booking} />

                      {viewTab === 'ai_summary' && hasAiSummaryRun ? (
                        <AiSummaryPanel booking={booking} onPreview={handlePreview} />
                      ) : null}
                      {viewTab === 'overview' && (
                        <div className="space-y-4">
                          <StayDetailsPanel booking={booking} />
                          <OtherInfoPanel booking={booking} />
                          <BookingMetaCard
                            booking={booking}
                            onCopyBookingId={() => void copyBookingIdToClipboard()}
                          />
                          <BookingAiAssistantAuditCard bookingId={booking.id} />
                        </div>
                      )}
                      {viewTab === 'guests' && (
                        <GuestsPanel booking={booking} onPreview={handlePreview} />
                      )}
                      {viewTab === 'parking' && booking.need_parking ? (
                        <ParkingPanel booking={booking} onPreview={handlePreview} />
                      ) : null}
                      {viewTab === 'pets' && booking.has_pets ? (
                        <PetsPanel booking={booking} onPreview={handlePreview} />
                      ) : null}
                      {viewTab === 'pricing' && booking.status !== 'PENDING_REVIEW' && (
                        <PricingSummaryPanel booking={booking} onPreview={handlePreview} />
                      )}
                      {viewTab === 'files' && (
                        <DocumentsPanel booking={booking} onPreview={handlePreview} />
                      )}
                    </BookingDetailShellBody>
                  </BookingDetailShell>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* ── Workflow / Progress (before fold on mobile when past review) ── */}
            <div
              className={cn(
                'w-full md:w-[min(100%,20rem)] md:shrink-0 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)] lg:w-[min(100%,24rem)] lg:self-start xl:w-[27rem]',
                isMobileWorkflowFirst && (mobileDetailsBeforeWorkflow ? 'order-3' : 'order-2'),
                isMobileWorkflowFirst && 'md:order-none'
              )}
            >
              <WorkflowPanel
                key={booking.id}
                booking={booking}
                onPreview={handlePreview}
                aiSummaryOpen={aiSummaryOpen}
                onOpenAiSummary={setAiSummaryOpen}
                canMutate={canMutateWorkflow}
              />
            </div>
          </div>
        )}
      </div>
      <BookingDetailAssetPreviewModal
        asset={previewAsset}
        booking={booking}
        loading={previewLoading}
        onClose={closePreview}
      />
      {booking && (
        <PayParkingModal
          booking={booking}
          open={payParkingModalOpen}
          onOpenChange={setPayParkingModalOpen}
        />
      )}
    </>
  );
}
