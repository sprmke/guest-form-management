/**
 * BookingDetailPage — /bookings/:bookingId
 *
 * View mode: header + tabbed read-only panels
 * (Overview / Guests / Parking? / Pets? / Pricing? / Files).
 * Edit mode: `BookingEditForm` (unchanged — Guest / Stay / Parking / Pets / Docs / Workflow).
 *
 * Mobile: compact summary strip; Progress stays above the fold; detail panels collapse.
 *
 * Right rail is `lg:sticky` so Progress stays visible while the left column scrolls, and the
 * booking refetches on a 60s interval (visibility-gated) so Gmail/cron-driven transitions
 * surface without a manual refresh — see `.claude/skills/admin-dashboard/SKILL.md`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams, Link, useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { buildPayParkingPath } from '@/features/guest/pay-parking/lib/api';
import { hasPayParkingAvailed } from '@/features/guest/pay-parking/lib/payParkingHelpers';

import { BookingDetailAssetPreviewModal } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal';
import { BookingDetailHeader } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailHeader';
import {
  BookingDetailTabs,
  type BookingViewTab,
} from '@/features/dashboard/bookings/components/booking-detail/BookingDetailTabs';
import { getDocType } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import type { BookingEditTabId } from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs';
import { AiValidationPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/AiValidationPanel';
import { DocumentsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/DocumentsPanel';
import { GuestsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/GuestsPanel';
import { OtherInfoPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/OtherInfoPanel';
import { ParkingPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/ParkingPanel';
import { PetsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/PetsPanel';
import { PricingSummaryPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/PricingSummaryPanel';
import { StayDetailsPanel } from '@/features/dashboard/bookings/components/booking-detail/panels/StayDetailsPanel';
import { BookingDetailMobileSummary } from '@/features/dashboard/bookings/components/BookingDetailMobileSummary';
import { BookingEditForm } from '@/features/dashboard/bookings/components/BookingEditForm';
import { BookingMetaCard } from '@/features/dashboard/bookings/components/BookingMetaCard';
import { PayParkingModal } from '@/features/dashboard/bookings/components/PayParkingModal';
import { PendingReviewWorkflowGate } from '@/features/dashboard/bookings/components/PendingReviewWorkflowGate';
import { WorkflowPanel } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPanel';
import { bookingDetailQueryKey, useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import { useBookingStayGuideLink } from '@/features/dashboard/bookings/hooks/useBookingStayGuideLink';
import { useReceiptAiBackfill } from '@/features/dashboard/bookings/hooks/useReceiptAiBackfill';
import { buildBookingDetailActions } from '@/features/dashboard/bookings/lib/bookingDetailActions';
import { resolveBookingViewTab } from '@/features/dashboard/bookings/lib/resolveBookingViewTab';
import {
  isStorageObjectNotFoundError,
  resolveAssetUrlForBrowser,
} from '@/features/dashboard/bookings/lib/storageUrls';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { BookingDetailPageSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/** Gmail/cron-driven transitions land server-side — poll for them while this page is open. */
const AUTO_REFRESH_INTERVAL_MS = 60_000;

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { propertySlug } = useOrgContext();
  const propertyId = usePropertyIdParam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const { isBackfilling: isReceiptAiBackfilling } = useReceiptAiBackfill(booking);
  const [editMode, setEditMode] = useState(false);
  const [editInitialTab, setEditInitialTab] = useState<BookingEditTabId | undefined>(undefined);
  const [payParkingModalOpen, setPayParkingModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{
    label: string;
    url: string;
    rawUrl: string;
    type: 'image' | 'pdf' | 'file';
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [viewTab, setViewTab] = useState<BookingViewTab>('overview');
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
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;
    setViewTab((tab) => resolveBookingViewTab(tab, booking));
  }, [booking]);

  useEffect(() => {
    if (editMode) setDetailsExpanded(true);
  }, [editMode]);

  // Surfaces Gmail-listener / SD-refund-cron transitions without a manual refresh.
  useEffect(() => {
    if (!bookingId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void queryClient.invalidateQueries({
        queryKey: bookingDetailQueryKey(bookingId, propertyId),
      });
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

  const handleStartEdit = useCallback((tab?: BookingEditTabId) => {
    setEditInitialTab(tab);
    setEditMode(true);
  }, []);

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

  const hostActions = useMemo(
    () =>
      booking
        ? buildBookingDetailActions({
            booking,
            onEdit: handleStartEdit,
            onPayParking: handleOpenPayParking,
            stayGuide,
          })
        : [],
    [booking, handleStartEdit, handleOpenPayParking, stayGuide]
  );

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
          ? 'This file is no longer in storage'
          : err instanceof Error
            ? err.message
            : 'Failed to open document'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

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
                onEdit={() => handleStartEdit()}
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
                    onClose={handleCloseEdit}
                    onSaved={handleCloseEdit}
                    onPreview={handlePreview}
                  />
                ) : (
                  <>
                    <BookingDetailHeader
                      booking={booking}
                      onEdit={() => handleStartEdit()}
                      actions={hostActions}
                      className={cn(isMobileWorkflowFirst && 'hidden md:block')}
                    />

                    <BookingDetailTabs value={viewTab} onChange={setViewTab} booking={booking} />

                    {viewTab === 'overview' && (
                      <div className="space-y-4">
                        <StayDetailsPanel booking={booking} />
                        <AiValidationPanel
                          booking={booking}
                          onPreview={handlePreview}
                          isDocumentAiBackfilling={isReceiptAiBackfilling}
                        />
                        <OtherInfoPanel booking={booking} />
                        <BookingMetaCard
                          booking={booking}
                          onCopyBookingId={() => void copyBookingIdToClipboard()}
                        />
                      </div>
                    )}
                    {viewTab === 'guests' && (
                      <GuestsPanel
                        booking={booking}
                        onPreview={handlePreview}
                        isDocumentAiBackfilling={isReceiptAiBackfilling}
                      />
                    )}
                    {viewTab === 'parking' && booking.need_parking ? (
                      <ParkingPanel booking={booking} onPreview={handlePreview} />
                    ) : null}
                    {viewTab === 'pets' && booking.has_pets ? (
                      <PetsPanel booking={booking} onPreview={handlePreview} />
                    ) : null}
                    {viewTab === 'pricing' && booking.status !== 'PENDING_REVIEW' && (
                      <PricingSummaryPanel
                        booking={booking}
                        onPreview={handlePreview}
                        isReceiptAiBackfilling={isReceiptAiBackfilling}
                      />
                    )}
                    {viewTab === 'files' && (
                      <DocumentsPanel
                        booking={booking}
                        onPreview={handlePreview}
                        isDocumentAiBackfilling={isReceiptAiBackfilling}
                      />
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* ── Workflow / Progress (before fold on mobile when past review) ── */}
            <div
              className={cn(
                'w-full md:w-[min(100%,20rem)] md:shrink-0 lg:sticky lg:top-5 lg:w-[min(100%,24rem)] lg:self-start xl:w-[27rem]',
                isMobileWorkflowFirst && (mobileDetailsBeforeWorkflow ? 'order-3' : 'order-2'),
                isMobileWorkflowFirst && 'md:order-none'
              )}
            >
              <PendingReviewWorkflowGate booking={booking}>
                <WorkflowPanel key={booking.id} booking={booking} />
              </PendingReviewWorkflowGate>
            </div>
          </div>
        )}
      </div>
      <BookingDetailAssetPreviewModal
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
    </>
  );
}
