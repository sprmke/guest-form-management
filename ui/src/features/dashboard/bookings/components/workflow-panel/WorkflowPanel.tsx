/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Orchestrator only: owns confirm-modal state, dev-controls state, `viewedStep`
 * state, calls `useWorkflowActions`/`useWorkflowSubFormDrafts` for derived
 * state, calls all mutation hooks, keeps the two auto-trigger `useEffect`s
 * (Gmail poll on load, stay-guide auto-issue), and composes the decomposed
 * children below. `variant`/`isModal` is passed down so each child branches
 * internally rather than this file building two separate trees.
 *
 * Shows:
 * - Progress card: **StatusBadge** in the header row + `BookingStepper` (per-step timing)
 * - Stage-specific sub-form (`WorkflowSubFormHost`)
 * - Dev-control checkboxes on Proceed/Back/Cancel confirm modals (session-persisted)
 * - Stay-guide link block, automation triggers (collapsible), transition actions bar
 * - Cancel booking (non-terminal; dev-control flags apply)
 *
 * Plan: docs/planning/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 * Auth: admin-auth.mdc §5 (Dev controls panel)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { guestSdFormPath, guestStayGuidePath } from '@/features/guest/lib/guestPublicPaths';

import { BookingStepper } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingStepper';
import { useGmailReconnectPrompt } from '@/features/dashboard/bookings/components/GmailReconnectProvider';
import { isParkingRequestDraftComplete } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { WorkflowActionsBar } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowActionsBar';
import { WorkflowAutomationTriggers } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowAutomationTriggers';
import { WorkflowConfirmModal } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowConfirmModal';
import { WorkflowStayGuideBlock } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowStayGuideBlock';
import { WorkflowSubFormHost } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowSubFormHost';
import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import {
  useTransitionBooking,
  useCancelBooking,
  useRunGmailPoll,
  useRunSdRefundCron,
  useResendSdRefundFormEmail,
  useIssueGuestStayGuideToken,
  type DevControlFlags,
  type TransitionPayload,
} from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import { useWorkflowActions } from '@/features/dashboard/bookings/hooks/useWorkflowActions';
import { useWorkflowSubFormDrafts } from '@/features/dashboard/bookings/hooks/useWorkflowSubFormDrafts';
import { resolveBookingPropertySlug } from '@/features/dashboard/bookings/lib/bookingListNavigation';
import { shouldWarnPastBookingStayForProceed } from '@/features/dashboard/bookings/lib/bookingPastPipelineManila';
import {
  isStayGuideEligibleStatus,
  statusLabel,
  type BookingStatus,
} from '@/features/dashboard/bookings/lib/bookingStatus';
import { DEFAULT_DOCUMENT_REQUIREMENTS } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  bookingNeedsGmailListenerPoll,
  defaultPendingDocNestedKey,
  initialViewedWorkflowStep,
  nestedKeyLabel,
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
  type ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';
import {
  loadPersistedWorkflowDevControls,
  mergeWorkflowDevControlsWithDefaults,
  persistWorkflowDevControls,
  workflowDevControlsForCancel,
  workflowDevControlsForTransition,
} from '@/features/dashboard/bookings/lib/workflowDevControls';
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

  // Dev controls — session-persisted per booking; defaults all checked.
  const [sessionDevControls, setSessionDevControls] = useState<DevControlFlags>(() =>
    mergeWorkflowDevControlsWithDefaults(loadPersistedWorkflowDevControls(booking.id))
  );
  const [modalDevControls, setModalDevControls] = useState<DevControlFlags>(sessionDevControls);

  useEffect(() => {
    setSessionDevControls(
      mergeWorkflowDevControlsWithDefaults(loadPersistedWorkflowDevControls(booking.id))
    );
  }, [booking.id]);

  const commitModalDevControls = useCallback((): DevControlFlags => {
    persistWorkflowDevControls(booking.id, modalDevControls);
    setSessionDevControls(modalDevControls);
    return modalDevControls;
  }, [booking.id, modalDevControls]);

  const toggleModalDevControl = useCallback((key: keyof DevControlFlags) => {
    setModalDevControls((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  const returnToLiveStep = useCallback(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking, documentRequirements));
  }, [status, booking, documentRequirements]);

  // Confirm modals
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    if (!confirm && !cancelConfirm) return;
    setModalDevControls(sessionDevControls);
  }, [confirm, cancelConfirm, sessionDevControls]);

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
  const issueStayGuideMut = useIssueGuestStayGuideToken(booking.id);
  /** One-shot legacy fallback when RFCI+ row predates auto-issue on transition. */
  const stayGuideAutoIssueRef = useRef<string | null>(null);

  const toastUnlessGmailReconnect = useCallback(
    (err: unknown, fallback: string) => {
      if (!handleGmailError(err)) {
        toast.error(friendlyToastError(err, fallback));
      }
    },
    [handleGmailError]
  );

  // Which automation triggers are relevant for this status (Q6.6)
  const showGmailPoll =
    status === 'PENDING_DOCUMENTS' || status === 'PENDING_GAF' || status === 'PENDING_PET_REQUEST';
  const showSdCron = status === 'READY_FOR_CHECKIN';
  const showSdFormResend = status === 'READY_FOR_CHECKOUT' || status === 'READY_FOR_CHECKIN';
  const showStayGuide = isStayGuideEligibleStatus(status);
  const stayGuideToken = booking.stay_guide_token?.trim() ?? '';
  const stayGuideUrl =
    stayGuideToken && propertySlug
      ? `${window.location.origin}${guestStayGuidePath(propertySlug, stayGuideToken)}`
      : '';
  const sdGuestFormUrl = `${window.location.origin}${guestSdFormPath(propertySlug, booking.id)}`;

  const [recheckSdGuestSubmitPending, setRecheckSdGuestSubmitPending] = useState(false);

  const copySdGuestFormUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sdGuestFormUrl);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [sdGuestFormUrl]);

  const copyStayGuideUrl = useCallback(async () => {
    if (!stayGuideUrl) return;
    try {
      await navigator.clipboard.writeText(stayGuideUrl);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [stayGuideUrl]);

  useEffect(() => {
    if (!showStayGuide || stayGuideToken || issueStayGuideMut.isPending) return;
    if (stayGuideAutoIssueRef.current === booking.id) return;
    stayGuideAutoIssueRef.current = booking.id;
    void issueStayGuideMut.mutateAsync().catch(() => {});
  }, [showStayGuide, stayGuideToken, booking.id, issueStayGuideMut.mutateAsync]);

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

  const transitionConfirmDevControls = confirm
    ? workflowDevControlsForTransition(status, confirm.toStatus, booking, documentRequirements)
    : [];
  const cancelConfirmDevControls = workflowDevControlsForCancel();

  // ─── Handlers ────────────────────────────────────────────────────────────

  function openForwardProceedConfirm(toStatus: BookingStatus, label: string) {
    setConfirm({
      toStatus,
      label,
      pastStayWarning: shouldWarnPastBookingStayForProceed(status, booking),
    });
  }

  function openBackConfirm(toStatus: BookingStatus) {
    setConfirm({ toStatus, label: `Back to ${statusLabel(toStatus)}` });
  }

  async function handleTransition(toStatus: BookingStatus) {
    const flags = commitModalDevControls();
    setConfirm(null);
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus,
        payload: subFormDrafts.buildPayload(toStatus),
        devControls: flags,
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
        devControls: sessionDevControls,
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
        devControls: sessionDevControls,
        manual: true,
      });
      toast.success(`Marked ${label} as incomplete`);
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not mark step incomplete');
    }
  }

  async function handleCancel() {
    const flags = commitModalDevControls();
    setCancelConfirm(false);
    try {
      await cancelMut.mutateAsync({
        bookingId: booking.id,
        devControls: flags,
      });
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
      {/* ── Pipeline stepper (detail rail only) ───────────────────────────── */}
      {!isModal && workflowActions.pipeline.length > 0 && status !== 'CANCELLED' ? (
        <div className="border-separator border-b px-4 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-overline">Progress</p>
            <StatusBadge status={booking.status} />
          </div>
          <BookingStepper
            booking={booking}
            documentRequirements={documentRequirements}
            currentStatus={status}
            statusUpdatedAt={booking.status_updated_at}
            viewedStep={viewedStep}
            onSelectStep={selectPipelineStep}
            onSelectSubStep={focusPendingDocSubView}
            disabled={transitionMut.isPending}
          />
        </div>
      ) : !isModal && status === 'CANCELLED' ? (
        <div className="border-separator border-b px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-overline">Status</p>
            <StatusBadge status={booking.status} />
          </div>
        </div>
      ) : null}

      {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
      <WorkflowSubFormHost
        isModal={isModal}
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

      {/* ── Stay guide (detail rail only) ──────────────────────────────────── */}
      <WorkflowStayGuideBlock
        isModal={isModal}
        showStayGuide={showStayGuide}
        stayGuideUrl={stayGuideUrl}
        pending={transitionMut.isPending || issueStayGuideMut.isPending}
        onCopy={() => void copyStayGuideUrl()}
      />

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
        isTerminal={workflowActions.isTerminal}
        isLiveView={workflowActions.isLiveView}
        status={status}
        onReturnToLiveStep={returnToLiveStep}
        transitionPending={transitionMut.isPending}
        inPendingDocuments={workflowActions.inPendingDocuments}
        viewingPendingDocSub={workflowActions.viewingPendingDocSub}
        prev={workflowActions.prev}
        next={workflowActions.next}
        onOpenBackConfirm={openBackConfirm}
        selectedPendingDocCanMarkIncomplete={workflowActions.selectedPendingDocCanMarkIncomplete}
        selectedPendingDocCanMarkComplete={workflowActions.selectedPendingDocCanMarkComplete}
        selectedPendingDocRequired={workflowActions.selectedPendingDocRequired}
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
          description={`Move from "${statusLabel(status)}" to "${statusLabel(confirm.toStatus)}". Uncheck side effects to skip.`}
          devControls={transitionConfirmDevControls}
          devControlValues={modalDevControls}
          onDevControlToggle={toggleModalDevControl}
          onConfirm={() => handleTransition(confirm.toStatus)}
          onCancel={() => setConfirm(null)}
          isLoading={transitionMut.isPending}
        />
      )}

      {cancelConfirm && (
        <WorkflowConfirmModal
          title="Cancel Booking"
          secondaryLabel="Keep booking"
          description="Marks booking CANCELLED. Uncheck integrations to skip. Guest data stays. Cannot be undone."
          devControls={cancelConfirmDevControls}
          devControlValues={modalDevControls}
          onDevControlToggle={toggleModalDevControl}
          onConfirm={handleCancel}
          onCancel={() => setCancelConfirm(false)}
          isLoading={cancelMut.isPending}
          destructive
        />
      )}
    </PanelRoot>
  );
}
