/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Orchestrator only: owns confirm-modal state, `viewedStep` state, calls
 * `useWorkflowActions`/`useWorkflowSubFormDrafts` for derived state, calls all
 * mutation hooks, keeps the Gmail-poll-on-load auto-trigger, and composes the
 * decomposed children below. `variant`/`isModal` is passed down so each child
 * branches internally rather than this file building two separate trees.
 *
 * Shows:
 * - Stage deck: `WorkflowStageDeckHeader` (one stage at a time, arrows + progress
 *   track) with the full `BookingStepper` behind `WorkflowProgressMapModal`
 * - Stage-specific sub-form (`WorkflowSubFormHost`) inside `WorkflowStageSlide`,
 *   with nested Pending Documents sub-steps as `WorkflowDocStepTabs`
 * - Automation triggers (collapsible), transition actions bar
 * - Cancel booking (non-terminal)
 *
 * Side effects (emails, PDFs, DB) run from server defaults on every transition;
 * per-property email automations are configured under Property Settings.
 *
 * The guest stay-guide link is deliberately **not** here — it is a booking-scoped
 * share action, so it lives in the header action menu (`useBookingStayGuideLink`).
 *
 * Plan: docs/planning/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { guestSdFormPath } from '@/features/guest/lib/guestPublicPaths';

import { useGmailReconnectPrompt } from '@/features/dashboard/bookings/components/GmailReconnectProvider';
import { isParkingRequestDraftComplete } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { WorkflowActionsBar } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowActionsBar';
import { WorkflowAutomationTriggers } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowAutomationTriggers';
import { WorkflowConfirmModal } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowConfirmModal';
import { WorkflowDocStepTabs } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowDocStepTabs';
import { WorkflowProgressMapModal } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowProgressMapModal';
import { WorkflowStageDeckHeader } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowStageDeckHeader';
import { WorkflowStageSlide } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowStageSlide';
import { WorkflowSubFormHost } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowSubFormHost';
import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import {
  useTransitionBooking,
  useCancelBooking,
  useRunGmailPoll,
  useRunSdRefundCron,
  useResendSdRefundFormEmail,
  type TransitionPayload,
} from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import { useWorkflowActions } from '@/features/dashboard/bookings/hooks/useWorkflowActions';
import { useWorkflowSubFormDrafts } from '@/features/dashboard/bookings/hooks/useWorkflowSubFormDrafts';
import { resolveBookingPropertySlug } from '@/features/dashboard/bookings/lib/bookingListNavigation';
import { shouldWarnPastBookingStayForProceed } from '@/features/dashboard/bookings/lib/bookingPastPipelineManila';
import { statusLabel, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import { DEFAULT_DOCUMENT_REQUIREMENTS } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  bookingNeedsGmailListenerPoll,
  defaultPendingDocNestedKey,
  initialViewedWorkflowStep,
  nestedKeyLabel,
  pendingDocumentsNestedItemsForStepper,
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
  type ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';
import { buildWorkflowStageDeck } from '@/features/dashboard/bookings/lib/workflowStageDeck';
import {
  workflowCancelEffectLines,
  workflowTransitionEffectLines,
} from '@/features/dashboard/bookings/lib/workflowTransitionEffectsCopy';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyPricingDefaults } from '@/features/dashboard/pricing/hooks/usePropertyPricing';

import {
  friendlyToastError,
  gmailPollSuccessMessage,
  sdRefundCronSuccessMessage,
} from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

/** Shared copy for manual "Run Gmail poll" and auto-poll on Pending Documents load. */
function buildGmailPollSuccessMessage(
  result: Parameters<typeof gmailPollSuccessMessage>[0]
): string {
  return gmailPollSuccessMessage(result);
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

type ConfirmState = {
  toStatus: BookingStatus;
  label: string;
  direction: 'forward' | 'back';
  /** Extra banner when stay dates are before today (Manila) for early pipeline statuses. */
  pastStayWarning?: boolean;
} | null;

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  booking: BookingRow;
  /** `modal` — kanban workflow dialog: no progress stepper, sticky action footer. */
  variant?: 'rail' | 'modal';
};

export function WorkflowPanel({ booking, variant = 'rail' }: Props) {
  const orgContext = useOptionalOrgContext();
  const propertySlug = resolveBookingPropertySlug(booking, orgContext?.propertySlug) ?? '';
  const isModal = variant === 'modal';
  const queryClient = useQueryClient();
  const {
    defaults: propertyPricingDefaults,
    data: propertyPricingData,
    isFetched: propertyPricingLoaded,
  } = usePropertyPricingDefaults();
  const status = booking.status as BookingStatus;

  const { data: appSettings } = useAppSettings();
  const documentRequirements =
    appSettings?.resolvedDocumentRequirements ?? DEFAULT_DOCUMENT_REQUIREMENTS;

  const [automationHelpOpen, setAutomationHelpOpen] = useState(false);
  const [progressMapOpen, setProgressMapOpen] = useState(false);

  // Sub-form draft state (pricing/parking/sd-refund/guest-balance/surprise-decor ack).
  const subFormDrafts = useWorkflowSubFormDrafts(booking, status);

  const [viewedStep, setViewedStep] = useState<ViewedWorkflowStep>(() =>
    initialViewedWorkflowStep(status, booking, documentRequirements)
  );

  useEffect(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking, documentRequirements));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, status, booking.need_parking, booking.has_pets, documentRequirements]);

  const focusPipelineView = useCallback(() => {
    setViewedStep({ kind: 'pipeline', status });
  }, [status]);

  const focusPendingDocSubView = useCallback((sub: PendingDocNestedKey) => {
    setViewedStep({ kind: 'pending-doc-sub', sub });
  }, []);

  const selectPipelineStep = useCallback(
    (step: BookingStatus) => {
      if (step === 'PENDING_DOCUMENTS') {
        const key = defaultPendingDocNestedKey(booking, documentRequirements);
        if (key) {
          setViewedStep({ kind: 'pending-doc-sub', sub: key });
          return;
        }
      }
      setViewedStep({ kind: 'pipeline', status: step });
    },
    [booking, documentRequirements]
  );

  // Pipeline navigation — the stepper + Proceed/Back buttons read from these.
  const workflowActions = useWorkflowActions(
    booking,
    status,
    viewedStep,
    subFormDrafts.parkingValues,
    documentRequirements
  );

  // ─── Stage deck ──────────────────────────────────────────────────────────
  // One pipeline stage on screen at a time; `viewedStep` stays the source of
  // truth so the map modal, sub-forms, and actions all read the same selection.
  const deck = buildWorkflowStageDeck(booking, status, viewedStep, documentRequirements);
  const deckStage = deck.stages[deck.viewedIndex] ?? null;
  /** Off-pipeline rows (CANCELLED, IMPORTED) get a plain status card, not a deck. */
  const showStageDeck = deck.currentIndex >= 0 && deckStage !== null;

  const goToDeckIndex = useCallback(
    (index: number) => {
      const stage = deck.stages[index];
      if (stage) selectPipelineStep(stage);
    },
    [deck.stages, selectPipelineStep]
  );

  const pendingDocTabItems = pendingDocumentsNestedItemsForStepper(booking, documentRequirements);

  // Confirm modals
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const transitionMut = useTransitionBooking();
  const cancelMut = useCancelBooking();
  const { handleGmailError } = useGmailReconnectPrompt();
  const gmailPollMut = useRunGmailPoll(booking.id);
  const gmailPollMutRef = useRef(gmailPollMut);
  gmailPollMutRef.current = gmailPollMut;
  /** Dedupes React Strict Mode double-invoke; cleared when leaving PENDING_DOCUMENTS. */
  const pendingDocsAutoGmailPollRef = useRef<string | null>(null);
  const sdCronMut = useRunSdRefundCron(booking.id);
  const resendSdFormMut = useResendSdRefundFormEmail(booking.id);

  const toastUnlessGmailReconnect = useCallback(
    (err: unknown, fallback: string) => {
      if (!handleGmailError(err)) {
        toast.error(friendlyToastError(err, fallback));
      }
    },
    [handleGmailError]
  );

  // Which automation triggers are relevant — only on the live, non-terminal step.
  const automationTriggersForLiveStep = workflowActions.isLiveView && !workflowActions.isTerminal;
  const showGmailPoll =
    automationTriggersForLiveStep &&
    (status === 'PENDING_DOCUMENTS' ||
      status === 'PENDING_GAF' ||
      status === 'PENDING_PET_REQUEST');
  const showSdCron = automationTriggersForLiveStep && status === 'READY_FOR_CHECKIN';
  const showSdFormResend =
    automationTriggersForLiveStep &&
    (status === 'READY_FOR_CHECKOUT' || status === 'READY_FOR_CHECKIN');
  const sdGuestFormUrl = `${window.location.origin}${guestSdFormPath(propertySlug, booking.id)}`;

  const [recheckSdGuestSubmitPending, setRecheckSdGuestSubmitPending] = useState(false);

  const copySdGuestFormUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sdGuestFormUrl);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [sdGuestFormUrl]);

  const recheckGuestSdSubmission = useCallback(async () => {
    const before = booking.status;
    setRecheckSdGuestSubmitPending(true);
    try {
      await queryClient.refetchQueries({
        queryKey: BOOKING_QUERY_KEY(booking.id),
      });
      const data = queryClient.getQueryData<BookingRow | null>(BOOKING_QUERY_KEY(booking.id));
      const next = data?.status ?? before;
      if (next === 'PENDING_SD_REFUND' && before !== 'PENDING_SD_REFUND') {
        toast.success('Guest submitted the SD refund form.');
      } else {
        toast.message('Still waiting for the guest SD refund form');
      }
    } catch (err) {
      toast.error(friendlyToastError(err, 'Could not refresh this booking'));
    } finally {
      setRecheckSdGuestSubmitPending(false);
    }
  }, [booking.id, booking.status, queryClient]);

  useEffect(() => {
    if (status !== 'PENDING_DOCUMENTS') {
      pendingDocsAutoGmailPollRef.current = null;
      return;
    }
    if (!bookingNeedsGmailListenerPoll(booking)) {
      pendingDocsAutoGmailPollRef.current = null;
      return;
    }
    const dedupeKey = `${booking.id}:PENDING_DOCUMENTS`;
    if (pendingDocsAutoGmailPollRef.current === dedupeKey) return;
    pendingDocsAutoGmailPollRef.current = dedupeKey;

    let cancelled = false;
    void (async () => {
      try {
        const result = await gmailPollMutRef.current.mutateAsync();
        if (cancelled) return;
        toast.success(buildGmailPollSuccessMessage(result));
      } catch (err: unknown) {
        if (cancelled) return;
        toastUnlessGmailReconnect(err, 'Gmail check failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    booking.id,
    booking.status,
    booking.gaf_completed_at,
    booking.approved_gaf_pdf_url,
    booking.gaf_manual_incomplete,
    booking.pet_completed_at,
    booking.approved_pet_pdf_url,
    booking.pet_manual_incomplete,
    booking.has_pets,
    status,
    toastUnlessGmailReconnect,
  ]);

  async function handleGmailPoll() {
    try {
      const result = await gmailPollMut.mutateAsync();
      toast.success(buildGmailPollSuccessMessage(result));
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Gmail check failed');
    }
  }

  async function handleSdCron() {
    try {
      const result = await sdCronMut.mutateAsync();
      const message = sdRefundCronSuccessMessage(result);
      if (message) {
        toast.success(message);
      } else {
        toast.message('Nothing to update right now');
      }
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Check-out automation failed'));
    }
  }

  async function handleResendSdFormEmail() {
    try {
      const result = await resendSdFormMut.mutateAsync();
      if (result.skipped) {
        toast.message('Skipped in production');
      } else {
        toast.success('SD refund form email sent');
      }
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Could not send email'));
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  function openForwardProceedConfirm(toStatus: BookingStatus, label: string) {
    setConfirm({
      toStatus,
      label,
      direction: 'forward',
      pastStayWarning: shouldWarnPastBookingStayForProceed(status, booking),
    });
  }

  function openBackConfirm(toStatus: BookingStatus) {
    setConfirm({ toStatus, label: `Return to ${statusLabel(toStatus)}`, direction: 'back' });
  }

  async function handleTransition(toStatus: BookingStatus) {
    setConfirm(null);
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus,
        payload: subFormDrafts.buildPayload(toStatus),
        manual: true,
      });
      toast.success(`Moved to ${statusLabel(toStatus)}`);
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not update booking status');
    }
  }

  async function handleMarkPendingDocSubStatusComplete(subStatus: PendingDocNestedKey) {
    const label = nestedKeyLabel(subStatus, documentRequirements);
    try {
      const payload: TransitionPayload = {
        document_completion_target: subStatus,
      };
      const parkingValues = subFormDrafts.parkingValues;
      if (
        subStatus === PARKING_NESTED_KEY &&
        parkingValues &&
        isParkingRequestDraftComplete(parkingValues)
      ) {
        payload.parking_owner = parkingValues.parking_owner.trim() || null;
        payload.parking_rate_paid = parkingValues.parking_rate_paid;
        payload.parking_endorsement_url = parkingValues.parking_endorsement_url || null;
        payload.parking_fee_included_in_downpayment =
          parkingValues.parking_fee_included_in_downpayment;
        payload.parking_payment_receipt_url = parkingValues.parking_fee_included_in_downpayment
          ? null
          : parkingValues.parking_payment_receipt_url || null;
      }
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: workflowActions.inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload,
        manual: true,
      });
      toast.success(`Marked ${label} as complete`);
      if (!workflowActions.inPendingDocuments) {
        focusPipelineView();
      }
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not mark step complete');
    }
  }

  async function handleMarkPendingDocSubStatusIncomplete(subStatus: PendingDocNestedKey) {
    const label = nestedKeyLabel(subStatus, documentRequirements);
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: workflowActions.inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload: { document_completion_clear_target: subStatus },
        manual: true,
      });
      toast.success(`Marked ${label} as incomplete`);
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not mark step incomplete');
    }
  }

  async function handleCancel() {
    setCancelConfirm(false);
    try {
      await cancelMut.mutateAsync({ bookingId: booking.id });
      toast.success('Booking cancelled');
    } catch (err: any) {
      toast.error(friendlyToastError(err, 'Could not cancel booking'));
    }
  }

  const PanelRoot = isModal ? 'div' : 'aside';

  return (
    <PanelRoot
      className={cn(
        'flex flex-col',
        isModal
          ? 'min-h-0 flex-1 overflow-hidden'
          : 'border-border bg-card gap-0 overflow-hidden rounded-xl border shadow-sm'
      )}
    >
      {/* ── Stage deck navigator (detail rail only) ───────────────────────── */}
      {!isModal && !showStageDeck ? (
        <div className="border-separator border-b px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-overline">Status</p>
            <StatusBadge status={booking.status} />
          </div>
        </div>
      ) : !isModal ? (
        <WorkflowStageDeckHeader
          stages={deck.stages}
          viewedIndex={deck.viewedIndex}
          currentIndex={deck.currentIndex}
          canGoPrev={deck.canGoPrev}
          canGoNext={deck.canGoNext}
          disabled={transitionMut.isPending}
          onPrev={() => goToDeckIndex(deck.viewedIndex - 1)}
          onNext={() => goToDeckIndex(deck.viewedIndex + 1)}
          onSelectIndex={goToDeckIndex}
          onOpenMap={() => setProgressMapOpen(true)}
        />
      ) : null}

      {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
      {isModal ? (
        <WorkflowSubFormHost
          isModal
          booking={booking}
          viewedContent={workflowActions.viewedContent}
          contentReadOnly={workflowActions.contentReadOnly}
          activePendingDocSubStatus={workflowActions.activePendingDocSubStatus}
          documentRequirements={documentRequirements}
          pricingValues={subFormDrafts.pricingValues}
          onPricingChange={subFormDrafts.setPricingValues}
          propertyPricingLoaded={propertyPricingLoaded}
          propertyPricingDefaults={propertyPricingDefaults}
          propertyPricingDateOverrides={propertyPricingData?.dateOverrides}
          propertyPricingHolidayRules={propertyPricingData?.holidayRules}
          surpriseDecorStaffAck={subFormDrafts.surpriseDecorStaffAck}
          onSurpriseDecorStaffAckChange={subFormDrafts.setSurpriseDecorStaffAck}
          parkingValues={subFormDrafts.parkingValues}
          onParkingChange={subFormDrafts.setParkingValues}
          guestBalanceValues={subFormDrafts.guestBalanceValues}
          onGuestBalanceChange={subFormDrafts.setGuestBalanceValues}
          sdRefundValues={subFormDrafts.sdRefundValues}
          onSdRefundChange={subFormDrafts.setSdRefundValues}
          sdGuestFormUrl={sdGuestFormUrl}
          onCopySdGuestFormUrl={() => void copySdGuestFormUrl()}
          recheckSdGuestSubmitPending={recheckSdGuestSubmitPending}
          onRecheckGuestSdSubmission={() => void recheckGuestSdSubmission()}
        />
      ) : (
        <WorkflowStageSlide
          stageKey={deckStage ?? 'no-stage'}
          index={deck.viewedIndex}
          onSwipePrev={deck.canGoPrev ? () => goToDeckIndex(deck.viewedIndex - 1) : undefined}
          onSwipeNext={deck.canGoNext ? () => goToDeckIndex(deck.viewedIndex + 1) : undefined}
        >
          {workflowActions.viewingPendingDocSub && pendingDocTabItems.length > 1 ? (
            <div className="border-separator border-b px-4 py-3">
              <WorkflowDocStepTabs
                items={pendingDocTabItems}
                value={workflowActions.activePendingDocSubStatus}
                onChange={focusPendingDocSubView}
                disabled={transitionMut.isPending}
              />
            </div>
          ) : null}
          <WorkflowSubFormHost
            isModal={false}
            booking={booking}
            viewedContent={workflowActions.viewedContent}
            contentReadOnly={workflowActions.contentReadOnly}
            activePendingDocSubStatus={workflowActions.activePendingDocSubStatus}
            documentRequirements={documentRequirements}
            pricingValues={subFormDrafts.pricingValues}
            onPricingChange={subFormDrafts.setPricingValues}
            propertyPricingLoaded={propertyPricingLoaded}
            propertyPricingDefaults={propertyPricingDefaults}
            propertyPricingDateOverrides={propertyPricingData?.dateOverrides}
            propertyPricingHolidayRules={propertyPricingData?.holidayRules}
            surpriseDecorStaffAck={subFormDrafts.surpriseDecorStaffAck}
            onSurpriseDecorStaffAckChange={subFormDrafts.setSurpriseDecorStaffAck}
            parkingValues={subFormDrafts.parkingValues}
            onParkingChange={subFormDrafts.setParkingValues}
            guestBalanceValues={subFormDrafts.guestBalanceValues}
            onGuestBalanceChange={subFormDrafts.setGuestBalanceValues}
            sdRefundValues={subFormDrafts.sdRefundValues}
            onSdRefundChange={subFormDrafts.setSdRefundValues}
            sdGuestFormUrl={sdGuestFormUrl}
            onCopySdGuestFormUrl={() => void copySdGuestFormUrl()}
            recheckSdGuestSubmitPending={recheckSdGuestSubmitPending}
            onRecheckGuestSdSubmission={() => void recheckGuestSdSubmission()}
          />
        </WorkflowStageSlide>
      )}

      {/* ── Automation triggers (detail rail only) ─────────────────────────── */}
      <WorkflowAutomationTriggers
        isModal={isModal}
        showGmailPoll={showGmailPoll}
        showSdCron={showSdCron}
        showSdFormResend={showSdFormResend}
        automationHelpOpen={automationHelpOpen}
        onToggleAutomationHelp={() => setAutomationHelpOpen((o) => !o)}
        gmailPollPending={gmailPollMut.isPending}
        sdCronPending={sdCronMut.isPending}
        resendSdFormPending={resendSdFormMut.isPending}
        onRunGmailPoll={handleGmailPoll}
        onRunSdCron={handleSdCron}
        onResendSdFormEmail={handleResendSdFormEmail}
      />

      {/* ── Transition actions ────────────────────────────────────────────── */}
      <WorkflowActionsBar
        isModal={isModal}
        status={status}
        isTerminal={workflowActions.isTerminal}
        isLiveView={workflowActions.isLiveView}
        transitionPending={transitionMut.isPending}
        inPendingDocuments={workflowActions.inPendingDocuments}
        viewingPendingDocSub={workflowActions.viewingPendingDocSub}
        prev={workflowActions.prev}
        next={workflowActions.next}
        onOpenBackConfirm={openBackConfirm}
        selectedPendingDocCanMarkIncomplete={workflowActions.selectedPendingDocCanMarkIncomplete}
        selectedPendingDocCanMarkComplete={workflowActions.selectedPendingDocCanMarkComplete}
        selectedPendingDocRequired={workflowActions.selectedPendingDocRequired}
        selectedPendingDocCompleted={workflowActions.selectedPendingDocCompleted}
        activePendingDocSubStatus={workflowActions.activePendingDocSubStatus}
        activePendingDocLabel={workflowActions.activePendingDocLabel}
        onMarkPendingDocSubStatusIncomplete={handleMarkPendingDocSubStatusIncomplete}
        onMarkPendingDocSubStatusComplete={handleMarkPendingDocSubStatusComplete}
        showProceedToReadyForCheckin={workflowActions.showProceedToReadyForCheckin}
        pendingDocumentsComplete={workflowActions.pendingDocumentsComplete}
        onOpenForwardProceedConfirm={openForwardProceedConfirm}
        showLateParkingActions={workflowActions.showLateParkingActions}
        livePipelineActions={workflowActions.livePipelineActions}
        isTransitionDisabled={subFormDrafts.isTransitionDisabled}
        cancelPending={cancelMut.isPending}
        onOpenCancelConfirm={() => setCancelConfirm(true)}
      />

      {/* ── Full progress map (on demand) ────────────────────────────────── */}
      {!isModal && showStageDeck ? (
        <WorkflowProgressMapModal
          open={progressMapOpen}
          onOpenChange={setProgressMapOpen}
          booking={booking}
          currentStatus={status}
          documentRequirements={documentRequirements}
          viewedStep={viewedStep}
          disabled={transitionMut.isPending}
          onSelectStep={selectPipelineStep}
          onSelectSubStep={focusPendingDocSubView}
        />
      ) : null}

      {/* ── Confirm transition modal ─────────────────────────────────────── */}
      {confirm && (
        <WorkflowConfirmModal
          title={confirm.label}
          secondaryLabel="Cancel"
          banner={
            confirm.pastStayWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">Stay dates are in the past</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/95 dark:text-amber-200/90">
                  Check-in or check-out is before today (Asia/Manila). Continue only if you still
                  want to advance.
                </p>
              </div>
            ) : null
          }
          description={`Move from "${statusLabel(status)}" to "${statusLabel(confirm.toStatus)}".`}
          effectLines={workflowTransitionEffectLines({
            fromStatus: status,
            toStatus: confirm.toStatus,
            direction: confirm.direction,
            booking,
            documentRequirements,
            automationToggles: appSettings?.automationToggles,
          })}
          onConfirm={() => handleTransition(confirm.toStatus)}
          onCancel={() => setConfirm(null)}
          isLoading={transitionMut.isPending}
        />
      )}

      {cancelConfirm && (
        <WorkflowConfirmModal
          title="Cancel Booking"
          secondaryLabel="Keep booking"
          description="This cannot be undone."
          effectLines={workflowCancelEffectLines()}
          onConfirm={handleCancel}
          onCancel={() => setCancelConfirm(false)}
          isLoading={cancelMut.isPending}
          destructive
        />
      )}
    </PanelRoot>
  );
}
