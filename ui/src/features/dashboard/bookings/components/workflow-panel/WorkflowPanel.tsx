/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Orchestrator only: owns confirm-modal state, `viewedStep` state, calls
 * `useWorkflowActions`/`useWorkflowSubFormDrafts` for derived state, calls all
 * mutation hooks, and composes the decomposed children below. `variant`/`isModal` is
 * passed down so each child branches internally rather than this file building two
 * separate trees.
 *
 * Shows:
 * - Stage deck: `WorkflowStageDeckHeader` (one stage at a time, arrows + progress
 *   track) with the full `BookingStepper` behind `WorkflowProgressMapModal`
 * - Stage-specific sub-form (`WorkflowSubFormHost`) inside `WorkflowStageSlide`,
 *   with nested Pending Documents sub-steps as `WorkflowDocStepTabs`
 * - Automation triggers (collapsible), transition actions bar
 * - Cancel booking (non-terminal)
 *
 * On `PENDING_REVIEW` the deck header renders as usual but the body and the
 * actions bar are replaced by `WorkflowPendingReviewAck` until the host confirms
 * (`usePendingReviewAck`), so progress stays readable while the stage is closed.
 *
 * Side effects (emails, PDFs, DB) run from server defaults on every transition;
 * per-property email automations are configured under Property Settings. When stay
 * dates are past or the booking was stepped back, forward Proceed confirms offer
 * optional email checkboxes (default off).
 *
 * The guest stay-guide link is deliberately **not** here — it is a booking-scoped
 * share action, so it lives in the header action menu (`useBookingStayGuideLink`).
 *
 * Plan: docs/planning/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 */

import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { guestSdFormPath } from '@/features/guest/lib/guestPublicPaths';

import { BookingAiSummaryPanel } from '@/features/dashboard/bookings/components/booking-detail/BookingAiSummaryPanel';
import { isParkingRequestDraftComplete } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { WorkflowActionsBar } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowActionsBar';
import { WorkflowAutomationTriggers } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowAutomationTriggers';
import {
  WorkflowConfirmModal,
  WorkflowStatusTransitionDescription,
} from '@/features/dashboard/bookings/components/workflow-panel/WorkflowConfirmModal';
import { WorkflowDocApprovalModal } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowDocApprovalModal';
import { WorkflowDocStepTabs } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowDocStepTabs';
import { WorkflowPendingReviewAck } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPendingReviewAck';
import { WorkflowProgressMapModal } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowProgressMapModal';
import { WorkflowStageDeckHeader } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowStageDeckHeader';
import { WorkflowStageSlide } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowStageSlide';
import { WorkflowSubFormHost } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowSubFormHost';
import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { usePendingReviewAck } from '@/features/dashboard/bookings/hooks/usePendingReviewAck';
import {
  useTransitionBooking,
  useCancelBooking,
  useRunSdRefundCron,
  useResendSdRefundFormEmail,
  type TransitionPayload,
} from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import { useUpdateBooking } from '@/features/dashboard/bookings/hooks/useUpdateBooking';
import { useWorkflowActions } from '@/features/dashboard/bookings/hooks/useWorkflowActions';
import { useWorkflowSubFormDrafts } from '@/features/dashboard/bookings/hooks/useWorkflowSubFormDrafts';
import { resolveBookingPropertySlug } from '@/features/dashboard/bookings/lib/bookingListNavigation';
import { shouldWarnPastBookingStayForProceed } from '@/features/dashboard/bookings/lib/bookingPastPipelineManila';
import {
  isEditableWorkflowProgressContent,
  progressSavePayloadForView,
} from '@/features/dashboard/bookings/lib/bookingProgressEditPayload';
import { statusLabel, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import { DEFAULT_DOCUMENT_REQUIREMENTS } from '@/features/dashboard/bookings/lib/documentRequirements';
import { pendingDocStepUsesApprovalModal } from '@/features/dashboard/bookings/lib/pendingDocApproval';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  defaultPendingDocNestedKey,
  initialViewedWorkflowStep,
  nestedKeyLabel,
  nextIncompletePendingDocKeyAfter,
  pendingDocumentsNestedItemsForStepper,
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
  type ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';
import { buildWorkflowStageDeck } from '@/features/dashboard/bookings/lib/workflowStageDeck';
import {
  workflowCancelEffectLines,
  workflowTransitionEffectLines,
  workflowTransitionEmailEffects,
} from '@/features/dashboard/bookings/lib/workflowTransitionEffectsCopy';
import {
  buildWorkflowEmailDevControls,
  defaultWorkflowEmailChoiceState,
  shouldOfferWorkflowEmailChoices,
  type WorkflowEmailDevControlKey,
} from '@/features/dashboard/bookings/lib/workflowTransitionEmailControls';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyPricingDefaults } from '@/features/dashboard/pricing/hooks/usePropertyPricing';

import { friendlyToastError, sdRefundCronSuccessMessage } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

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
  /** Opens the shared booking asset preview modal (required for file View actions). */
  onPreview: BookingAssetPreviewHandler;
  /** AI Summary panel open state — controlled by the parent so the sidebar rail can open it. */
  aiSummaryOpen?: boolean;
  onOpenAiSummary?: (open: boolean) => void;
};

export function WorkflowPanel({
  booking,
  variant = 'rail',
  onPreview,
  aiSummaryOpen = false,
  onOpenAiSummary,
}: Props) {
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

  // PENDING_REVIEW gate: the deck header below still renders, only the body and
  // the transition actions wait on the host's confirmation.
  const { needsReviewAck, confirmReview } = usePendingReviewAck(booking);

  const { data: appSettings } = useAppSettings();
  const documentRequirements =
    appSettings?.resolvedDocumentRequirements ?? DEFAULT_DOCUMENT_REQUIREMENTS;

  const [automationHelpOpen, setAutomationHelpOpen] = useState(false);
  const [progressMapOpen, setProgressMapOpen] = useState(false);

  const [viewedStep, setViewedStep] = useState<ViewedWorkflowStep>(() =>
    initialViewedWorkflowStep(status, booking, documentRequirements)
  );

  useEffect(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking, documentRequirements));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, status, booking.need_parking, booking.has_pets, documentRequirements]);

  const viewedDraftKey =
    viewedStep.kind === 'pipeline' ? viewedStep.status : `doc:${viewedStep.sub}`;

  // Sub-form draft state (pricing/parking/sd-refund/guest-balance/surprise-decor ack).
  const subFormDrafts = useWorkflowSubFormDrafts(booking, status, viewedDraftKey);

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
  const [emailChoices, setEmailChoices] = useState<
    Partial<Record<WorkflowEmailDevControlKey, boolean>>
  >({});
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [docApprovalModalSub, setDocApprovalModalSub] = useState<PendingDocNestedKey | null>(null);

  const transitionMut = useTransitionBooking();
  const cancelMut = useCancelBooking();
  const updateMut = useUpdateBooking();

  const persistPartialDrafts =
    !workflowActions.contentReadOnly && (!workflowActions.isLiveView || status === 'COMPLETED');

  /** Live pipeline step: persist quietly so the footer stays Return / Proceed / Cancel. */
  const liveProgressAutosave =
    workflowActions.isLiveView && status !== 'COMPLETED' && !workflowActions.contentReadOnly;

  const [liveAutosaveFailed, setLiveAutosaveFailed] = useState(false);

  const showProgressSave =
    (!liveProgressAutosave || liveAutosaveFailed) &&
    !workflowActions.contentReadOnly &&
    subFormDrafts.progressDirty &&
    isEditableWorkflowProgressContent(workflowActions.viewedContent);

  const handleProgressSave = useCallback(
    async (opts?: { quiet?: boolean }) => {
      const payload = progressSavePayloadForView(booking, workflowActions.viewedContent, {
        pricing: subFormDrafts.pricingValues,
        parking: subFormDrafts.parkingValues,
        guestBalance: subFormDrafts.guestBalanceValues,
        sdRefund: subFormDrafts.sdRefundValues,
        sdRefundGuest: subFormDrafts.sdRefundGuestValues,
        surpriseDecorStaffAck: subFormDrafts.surpriseDecorStaffAck,
      });
      if (!payload) {
        if (!opts?.quiet) {
          toast.error('Fill in the required fields before saving');
        }
        return;
      }
      try {
        await updateMut.mutateAsync({
          bookingId: booking.id,
          currentStatus: booking.status,
          payload,
          revertToPendingReview: false,
        });
        subFormDrafts.clearProgressDirty();
        setLiveAutosaveFailed(false);
        if (!opts?.quiet) toast.success('Saved');
      } catch (err: unknown) {
        if (opts?.quiet) setLiveAutosaveFailed(true);
        toast.error(friendlyToastError(err, 'Could not save'));
      }
    },
    [
      booking,
      workflowActions.viewedContent,
      subFormDrafts.pricingValues,
      subFormDrafts.parkingValues,
      subFormDrafts.guestBalanceValues,
      subFormDrafts.sdRefundValues,
      subFormDrafts.sdRefundGuestValues,
      subFormDrafts.surpriseDecorStaffAck,
      subFormDrafts.clearProgressDirty,
      updateMut,
    ]
  );

  useEffect(() => {
    if (!liveProgressAutosave || !subFormDrafts.progressDirty) return;
    if (!isEditableWorkflowProgressContent(workflowActions.viewedContent)) return;
    if (updateMut.isPending || transitionMut.isPending || cancelMut.isPending) return;

    const timer = window.setTimeout(() => {
      void handleProgressSave({ quiet: true });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    liveProgressAutosave,
    subFormDrafts.progressDirty,
    subFormDrafts.pricingValues,
    subFormDrafts.parkingValues,
    subFormDrafts.guestBalanceValues,
    subFormDrafts.sdRefundValues,
    subFormDrafts.sdRefundGuestValues,
    subFormDrafts.surpriseDecorStaffAck,
    workflowActions.viewedContent,
    handleProgressSave,
    updateMut.isPending,
    transitionMut.isPending,
    cancelMut.isPending,
  ]);

  useEffect(() => {
    setLiveAutosaveFailed(false);
  }, [booking.id, workflowActions.viewedContent, workflowActions.isLiveView]);
  const sdCronMut = useRunSdRefundCron(booking.id);
  const resendSdFormMut = useResendSdRefundFormEmail(booking.id);

  // Which automation triggers are relevant — only on the live, non-terminal step.
  const automationTriggersForLiveStep = workflowActions.isLiveView && !workflowActions.isTerminal;
  const showSdCron = automationTriggersForLiveStep && status === 'READY_FOR_CHECKIN';
  const showSdFormResend = automationTriggersForLiveStep && status === 'READY_FOR_CHECKOUT';
  const sdGuestFormUrl = `${window.location.origin}${guestSdFormPath(propertySlug, booking.id)}`;

  const [recheckSdGuestSubmitPending, setRecheckSdGuestSubmitPending] = useState(false);

  const copySdGuestFormUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sdGuestFormUrl);
      toast.success('SD Refund Form link copied');
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
        toast.success('Check-out Instructions email sent');
      }
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Could not send Check-out Instructions email'));
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  function openForwardProceedConfirm(toStatus: BookingStatus, label: string) {
    const pastStayWarning = shouldWarnPastBookingStayForProceed(status, booking);
    setConfirm({
      toStatus,
      label,
      direction: 'forward',
      pastStayWarning,
    });
    const effectsInput = {
      fromStatus: status,
      toStatus,
      direction: 'forward' as const,
      booking,
      documentRequirements,
      automationToggles: appSettings?.automationToggles,
    };
    if (shouldOfferWorkflowEmailChoices(effectsInput)) {
      setEmailChoices(
        defaultWorkflowEmailChoiceState(workflowTransitionEmailEffects(effectsInput))
      );
    } else {
      setEmailChoices({});
    }
  }

  function openBackConfirm(toStatus: BookingStatus) {
    setEmailChoices({});
    setConfirm({ toStatus, label: `Return to ${statusLabel(toStatus)}`, direction: 'back' });
  }

  async function handleTransition(
    toStatus: BookingStatus,
    devControls?: ReturnType<typeof buildWorkflowEmailDevControls>
  ) {
    setConfirm(null);
    setEmailChoices({});
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus,
        payload: subFormDrafts.buildPayload(toStatus),
        ...(devControls ? { devControls } : {}),
        manual: true,
      });
      toast.success(`Moved to ${statusLabel(toStatus)}`);
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Could not update booking status'));
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
      const result = await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: workflowActions.inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload,
        manual: true,
      });
      toast.success(`Marked ${label} as complete`);
      if (!workflowActions.inPendingDocuments) {
        focusPipelineView();
      } else {
        const nextKey = nextIncompletePendingDocKeyAfter(
          result.booking,
          documentRequirements,
          subStatus
        );
        if (nextKey) {
          focusPendingDocSubView(nextKey);
        }
      }
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, 'Could not mark step complete'));
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
          : 'border-border bg-card gap-0 overflow-hidden rounded-xl border shadow-sm lg:max-h-[calc(100dvh-2.5rem)]'
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
      {needsReviewAck ? (
        <WorkflowPendingReviewAck
          bookingId={booking.id}
          isModal={isModal}
          onConfirm={confirmReview}
          onOpenAiSummary={onOpenAiSummary ? () => onOpenAiSummary(true) : undefined}
        />
      ) : isModal ? (
        <WorkflowSubFormHost
          isModal
          booking={booking}
          viewedContent={workflowActions.viewedContent}
          contentReadOnly={workflowActions.contentReadOnly}
          persistPartialDrafts={persistPartialDrafts}
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
          onSdRefundGuestChange={subFormDrafts.setSdRefundGuestValues}
          sdGuestFormUrl={sdGuestFormUrl}
          onCopySdGuestFormUrl={() => void copySdGuestFormUrl()}
          recheckSdGuestSubmitPending={recheckSdGuestSubmitPending}
          onRecheckGuestSdSubmission={() => void recheckGuestSdSubmission()}
          onPreview={onPreview}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                  disabled={transitionMut.isPending || updateMut.isPending}
                />
              </div>
            ) : null}
            <WorkflowSubFormHost
              isModal={false}
              booking={booking}
              viewedContent={workflowActions.viewedContent}
              contentReadOnly={workflowActions.contentReadOnly}
              persistPartialDrafts={persistPartialDrafts}
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
              onSdRefundGuestChange={subFormDrafts.setSdRefundGuestValues}
              sdGuestFormUrl={sdGuestFormUrl}
              onCopySdGuestFormUrl={() => void copySdGuestFormUrl()}
              recheckSdGuestSubmitPending={recheckSdGuestSubmitPending}
              onRecheckGuestSdSubmission={() => void recheckGuestSdSubmission()}
              onPreview={onPreview}
            />
          </WorkflowStageSlide>
        </div>
      )}

      {/* ── Automation triggers (detail rail only) ─────────────────────────── */}
      {!needsReviewAck ? (
        <>
          <WorkflowAutomationTriggers
            isModal={isModal}
            showSdCron={showSdCron}
            showSdFormResend={showSdFormResend}
            sdRefundEmailLeadMinutes={appSettings?.sdRefundCronEmailLeadMinutes}
            automationHelpOpen={automationHelpOpen}
            onToggleAutomationHelp={() => setAutomationHelpOpen((o) => !o)}
            sdCronPending={sdCronMut.isPending}
            resendSdFormPending={resendSdFormMut.isPending}
            onRunSdCron={handleSdCron}
            onResendSdFormEmail={handleResendSdFormEmail}
          />

          {/* ── Transition actions ──────────────────────────────────────── */}
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
            selectedPendingDocCanMarkComplete={workflowActions.selectedPendingDocCanMarkComplete}
            selectedPendingDocUsesApprovalModal={
              workflowActions.selectedPendingDocUsesApprovalModal
            }
            selectedPendingDocRequired={workflowActions.selectedPendingDocRequired}
            selectedPendingDocCompleted={workflowActions.selectedPendingDocCompleted}
            activePendingDocSubStatus={workflowActions.activePendingDocSubStatus}
            activePendingDocLabel={workflowActions.activePendingDocLabel}
            onMarkPendingDocSubStatusComplete={handleMarkPendingDocSubStatusComplete}
            onOpenDocApprovalModal={setDocApprovalModalSub}
            showProceedToReadyForCheckin={workflowActions.showProceedToReadyForCheckin}
            pendingDocumentsComplete={workflowActions.pendingDocumentsComplete}
            pendingDocumentsBlockedHint={workflowActions.pendingDocumentsBlockedHint}
            onOpenForwardProceedConfirm={openForwardProceedConfirm}
            showLateParkingActions={workflowActions.showLateParkingActions}
            livePipelineActions={workflowActions.livePipelineActions}
            isTransitionDisabled={subFormDrafts.isTransitionDisabled}
            cancelPending={cancelMut.isPending}
            onOpenCancelConfirm={() => setCancelConfirm(true)}
            showProgressSave={showProgressSave}
            progressSavePending={updateMut.isPending}
            onProgressSave={() => void handleProgressSave()}
          />
        </>
      ) : null}

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
          sdRefundEmailLeadMinutes={appSettings?.sdRefundCronEmailLeadMinutes}
        />
      ) : null}

      {/* ── Confirm transition modal ─────────────────────────────────────── */}
      {confirm
        ? (() => {
            const transitionEffectsInput = {
              fromStatus: status,
              toStatus: confirm.toStatus,
              direction: confirm.direction,
              booking,
              documentRequirements,
              automationToggles: appSettings?.automationToggles,
            };
            const confirmEmailEffects =
              confirm.direction === 'forward'
                ? workflowTransitionEmailEffects(transitionEffectsInput)
                : [];
            const offerEmailChoices =
              confirm.direction === 'forward' &&
              shouldOfferWorkflowEmailChoices(transitionEffectsInput);

            return (
              <WorkflowConfirmModal
                title={confirm.label}
                secondaryLabel="Cancel"
                banner={
                  confirm.pastStayWarning ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      <p className="font-semibold">Stay dates are in the past</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-900/95 dark:text-amber-200/90">
                        Check-in or check-out is before today (Asia/Manila). Continue only if you
                        still want to advance.
                      </p>
                    </div>
                  ) : null
                }
                description={
                  <WorkflowStatusTransitionDescription
                    fromStatus={status}
                    toStatus={confirm.toStatus}
                  />
                }
                effectLines={workflowTransitionEffectLines(transitionEffectsInput, {
                  includeEmailLines: !offerEmailChoices,
                })}
                emailEffects={offerEmailChoices ? confirmEmailEffects : undefined}
                emailChoices={offerEmailChoices ? emailChoices : undefined}
                onEmailChoiceChange={
                  offerEmailChoices
                    ? (key, checked) => {
                        setEmailChoices((prev) => ({ ...prev, [key]: checked }));
                      }
                    : undefined
                }
                onConfirm={() =>
                  handleTransition(
                    confirm.toStatus,
                    offerEmailChoices
                      ? buildWorkflowEmailDevControls(confirmEmailEffects, emailChoices)
                      : undefined
                  )
                }
                onCancel={() => {
                  setConfirm(null);
                  setEmailChoices({});
                }}
                isLoading={transitionMut.isPending}
              />
            );
          })()
        : null}

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

      {docApprovalModalSub &&
      pendingDocStepUsesApprovalModal(docApprovalModalSub, documentRequirements) ? (
        <WorkflowDocApprovalModal
          open
          booking={booking}
          sub={docApprovalModalSub}
          requirements={documentRequirements}
          onPreview={onPreview}
          isConfirming={transitionMut.isPending}
          onClose={() => setDocApprovalModalSub(null)}
          onConfirm={async () => {
            await handleMarkPendingDocSubStatusComplete(docApprovalModalSub);
            setDocApprovalModalSub(null);
          }}
        />
      ) : null}

      {onOpenAiSummary && (
        <BookingAiSummaryPanel
          booking={booking}
          open={aiSummaryOpen}
          onOpenChange={onOpenAiSummary}
          onPreview={onPreview}
        />
      )}
    </PanelRoot>
  );
}
