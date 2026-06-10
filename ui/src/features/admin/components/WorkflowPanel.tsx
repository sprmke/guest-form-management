/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Shows:
 * - Progress card: **StatusBadge** in the header row + pipeline stepper (per-step timing)
 * - Stage-specific sub-form (ReviewPricingForm + SurpriseDecorAckCard when applicable,
 *   ParkingRequestForm / SdRefundForm),
 *   plus **READY_FOR_CHECKOUT** guest `/sd-form` link + copy + **Recheck** (refetch booking)
 * - Dev-control checkboxes on Proceed/Back/Cancel confirm modals (session-persisted)
 * - Automation triggers (collapsible help + manual run buttons when expanded)
 * - Available transition buttons (from canTransition / canManualForceTransition)
 * - Cancel booking (non-terminal; dev-control flags apply)
 *
 * Plan: docs/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 * Auth: admin-auth.mdc §5 (Dev controls panel)
 */

import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Timer,
  X,
} from 'lucide-react';
import { WorkflowDevControlsChecklist } from '@/features/admin/components/WorkflowDevControlsChecklist';
import {
  ReviewPricingForm,
  type ReviewPricingFormValues,
} from '@/features/admin/components/ReviewPricingForm';
import { SurpriseDecorAckCard } from '@/features/admin/components/SurpriseDecorAckCard';
import {
  ParkingRequestForm,
  isParkingRequestDraftComplete,
  type ParkingRequestValues,
} from '@/features/admin/components/ParkingRequestForm';
import {
  InlineCopyIconButton,
  SdRefundForm,
  type SdRefundValues,
} from '@/features/admin/components/SdRefundForm';
import {
  GuestBalanceSettlementForm,
  type GuestBalanceSettlementValues,
} from '@/features/admin/components/GuestBalanceSettlementForm';
import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';
import { HistoricalApprovalBackfillDialog } from '@/features/admin/components/HistoricalApprovalBackfillDialog';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import {
  arePendingDocumentsComplete,
  bookingNeedsGmailListenerPoll,
  bookingPipeline,
  canNavigatePendingParkingSubStep,
  defaultPendingDocSub,
  initialViewedWorkflowStep,
  isLiveWorkflowView,
  isSubStatusCompleted,
  isSubStatusCompletedInStepper,
  isSubStatusRequired,
  nextStep,
  type PendingDocumentSubStatus,
  previousStep,
  requiredSubForm,
  workflowContentForView,
  type ViewedWorkflowStep,
} from '@/features/admin/lib/workflow';
import {
  TERMINAL_STATUSES,
  statusLabel,
  type BookingStatus,
} from '@/features/admin/lib/bookingStatus';
import {
  formatBookingDate,
  formatRelative,
} from '@/features/admin/lib/formatters';
import { shouldWarnPastBookingStayForProceed } from '@/features/admin/lib/bookingPastPipelineManila';
import {
  loadPersistedWorkflowDevControls,
  mergeWorkflowDevControlsWithDefaults,
  persistWorkflowDevControls,
  workflowDevControlsForCancel,
  workflowDevControlsForTransition,
  type WorkflowDevControlDef,
} from '@/features/admin/lib/workflowDevControls';
import {
  historicalBackfillDismissStorageKey,
  shouldOfferHistoricalApprovalBackfill,
} from '@/features/admin/lib/historicalBackfillEligibility';
import {
  useTransitionBooking,
  useCancelBooking,
  useRunGmailPoll,
  useRunSdRefundCron,
  useResendSdRefundFormEmail,
  type DevControlFlags,
  type TransitionPayload,
} from '@/features/admin/hooks/useTransitionBooking';
import { BOOKING_QUERY_KEY } from '@/features/admin/hooks/useBooking';
import type { BookingRow } from '@/features/admin/lib/types';
import { cn } from '@/lib/utils';
import {
  workflowBackActionClass,
  workflowDestructiveActionClass,
  workflowInlineLink,
  workflowNeutralActionClass,
  workflowPrimaryActionClass,
  workflowWarningActionClass,
} from '@/features/admin/lib/workflowActionButtonStyles';

/** Shared copy for manual “Run Gmail poll” and auto-poll on Pending Documents load. */
function buildGmailPollSuccessMessage(result: {
  applied?: number;
  skipped?: number;
  failed?: number;
  reconciled?: number;
  initialized?: boolean;
  historyReset?: boolean;
}): string {
  const applied = result.applied ?? 0;
  const reconciled = result.reconciled ?? 0;
  const recSuffix =
    reconciled > 0
      ? `, ${reconciled} sub-step(s) re-synced from saved approvals`
      : '';
  if (result.initialized) {
    return 'Gmail cursor initialized (Please run again.)';
  }
  if (result.historyReset) {
    return 'Gmail history expired and was reset — check for missed emails manually';
  }
  return `Gmail poll complete: ${applied} applied, ${result.skipped ?? 0} skipped, ${result.failed ?? 0} failed${recSuffix}`;
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
};

export function WorkflowPanel({ booking }: Props) {
  const queryClient = useQueryClient();
  const status = booking.status as BookingStatus;
  const isTerminal = TERMINAL_STATUSES.has(status);

  const [automationHelpOpen, setAutomationHelpOpen] = useState(false);

  // Dev controls — session-persisted per booking; defaults all checked.
  const [sessionDevControls, setSessionDevControls] = useState<DevControlFlags>(
    () =>
      mergeWorkflowDevControlsWithDefaults(
        loadPersistedWorkflowDevControls(booking.id),
      ),
  );
  const [modalDevControls, setModalDevControls] =
    useState<DevControlFlags>(sessionDevControls);

  useEffect(() => {
    setSessionDevControls(
      mergeWorkflowDevControlsWithDefaults(
        loadPersistedWorkflowDevControls(booking.id),
      ),
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

  // Sub-form state
  const [pricingValues, setPricingValues] =
    useState<ReviewPricingFormValues | null>(null);
  const [surpriseDecorStaffAck, setSurpriseDecorStaffAck] = useState(
    () => !!booking.surprise_decor_staff_acknowledged,
  );

  useEffect(() => {
    setSurpriseDecorStaffAck(!!booking.surprise_decor_staff_acknowledged);
  }, [booking.id, booking.surprise_decor_staff_acknowledged]);
  const [parkingValues, setParkingValues] =
    useState<ParkingRequestValues | null>(null);
  const [sdRefundValues, setSdRefundValues] = useState<SdRefundValues | null>(
    null,
  );
  const [guestBalanceValues, setGuestBalanceValues] =
    useState<GuestBalanceSettlementValues | null>(null);
  const [viewedStep, setViewedStep] = useState<ViewedWorkflowStep>(() =>
    initialViewedWorkflowStep(status, booking),
  );

  const activePendingDocSubStatus =
    viewedStep.kind === 'pending-doc-sub'
      ? viewedStep.sub
      : defaultPendingDocSub(booking);

  useEffect(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking));
  }, [booking.id, status, booking.need_parking, booking.has_pets]);

  const focusPipelineView = useCallback(() => {
    setViewedStep({ kind: 'pipeline', status });
  }, [status]);

  const focusPendingDocSubView = useCallback(
    (sub: PendingDocumentSubStatus) => {
      setViewedStep({ kind: 'pending-doc-sub', sub });
    },
    [],
  );

  const selectPipelineStep = useCallback(
    (step: BookingStatus) => {
      if (step === 'PENDING_DOCUMENTS') {
        setViewedStep({
          kind: 'pending-doc-sub',
          sub: defaultPendingDocSub(booking),
        });
        return;
      }
      setViewedStep({ kind: 'pipeline', status: step });
    },
    [booking],
  );

  // Confirm modals
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    if (!confirm && !cancelConfirm) return;
    setModalDevControls(sessionDevControls);
  }, [confirm, cancelConfirm, sessionDevControls]);

  const transitionMut = useTransitionBooking();
  const cancelMut = useCancelBooking();
  const gmailPollMut = useRunGmailPoll(booking.id);
  const gmailPollMutRef = useRef(gmailPollMut);
  gmailPollMutRef.current = gmailPollMut;
  /** Dedupes React Strict Mode double-invoke; cleared when leaving PENDING_DOCUMENTS. */
  const pendingDocsAutoGmailPollRef = useRef<string | null>(null);
  const pendingDocsAutoBackfillModalRef = useRef<string | null>(null);
  const [historicalBackfillOpen, setHistoricalBackfillOpen] = useState(false);
  const sdCronMut = useRunSdRefundCron(booking.id);
  const resendSdFormMut = useResendSdRefundFormEmail(booking.id);

  // Which automation triggers are relevant for this status (Q6.6)
  const showGmailPoll =
    status === 'PENDING_DOCUMENTS' ||
    status === 'PENDING_GAF' ||
    status === 'PENDING_PET_REQUEST';
  const showHistoricalBackfill = shouldOfferHistoricalApprovalBackfill(booking);
  const showSdCron = status === 'READY_FOR_CHECKIN';
  const showSdFormResend =
    status === 'READY_FOR_CHECKOUT' || status === 'READY_FOR_CHECKIN';
  const sdGuestFormUrl = `${window.location.origin}/sd-form?bookingId=${encodeURIComponent(booking.id)}`;

  const [recheckSdGuestSubmitPending, setRecheckSdGuestSubmitPending] =
    useState(false);

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
      const data = queryClient.getQueryData<BookingRow | null>(
        BOOKING_QUERY_KEY(booking.id),
      );
      const next = data?.status ?? before;
      if (next === 'PENDING_SD_REFUND' && before !== 'PENDING_SD_REFUND') {
        toast.success('Guest submitted the SD refund form.');
      } else {
        toast.message(
          'We’re still waiting for the guest to submit the SD Refund Form.',
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not refresh this booking.',
      );
    } finally {
      setRecheckSdGuestSubmitPending(false);
    }
  }, [booking.id, booking.status, queryClient]);

  useEffect(() => {
    if (status !== 'PENDING_DOCUMENTS') {
      pendingDocsAutoGmailPollRef.current = null;
      pendingDocsAutoBackfillModalRef.current = null;
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
        toast.error(err instanceof Error ? err.message : 'Gmail poll failed');
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
  ]);

  useEffect(() => {
    if (status !== 'PENDING_DOCUMENTS') {
      pendingDocsAutoBackfillModalRef.current = null;
      setHistoricalBackfillOpen(false);
      return;
    }
    if (!shouldOfferHistoricalApprovalBackfill(booking)) return;

    const dismissKey = historicalBackfillDismissStorageKey(booking.id);
    try {
      if (sessionStorage.getItem(dismissKey) === '1') return;
    } catch {
      /* sessionStorage unavailable */
    }

    const dedupeKey = `${booking.id}:backfill-modal`;
    if (pendingDocsAutoBackfillModalRef.current === dedupeKey) return;
    pendingDocsAutoBackfillModalRef.current = dedupeKey;
    setHistoricalBackfillOpen(true);
  }, [
    booking.id,
    booking.status,
    booking.created_at,
    booking.gaf_completed_at,
    booking.approved_gaf_pdf_url,
    booking.gaf_manual_incomplete,
    status,
  ]);

  const dismissHistoricalBackfillModal = useCallback(() => {
    setHistoricalBackfillOpen(false);
    try {
      sessionStorage.setItem(
        historicalBackfillDismissStorageKey(booking.id),
        '1',
      );
    } catch {
      /* ignore */
    }
  }, [booking.id]);

  async function handleGmailPoll() {
    try {
      const result = await gmailPollMut.mutateAsync();
      toast.success(buildGmailPollSuccessMessage(result));
    } catch (err: any) {
      toast.error(err?.message ?? 'Gmail poll failed');
    }
  }

  async function handleSdCron() {
    try {
      const result = await sdCronMut.mutateAsync();
      const transitioned = result.transitioned ?? 0;
      const suppressed = result.transitionedSdEmailSuppressed ?? 0;
      const sent = result.transitionedSdEmailSent ?? 0;
      const checkoutOnly = result.checkoutEmailsSent ?? 0;
      if (transitioned > 0) {
        const suffix =
          suppressed > 0 && sent === 0
            ? ' (automated guest email skipped — check-out older than configured window)'
            : suppressed > 0
              ? ` (${sent} check-out email(s) tied to runs, ${suppressed} stale check-out without guest email)`
              : '';
        toast.success(
          `SD refund cron: ${transitioned} booking(s) → Ready for Check-out${suffix}`,
        );
      } else if (checkoutOnly > 0) {
        toast.success(
          `SD refund cron: sent check-out email to ${checkoutOnly} stay(s) still on Ready for check-in (awaiting final balance before status moves to Ready for check-out).`,
        );
      } else {
        const scanned = result.scanned ?? 0;
        const isScoped = Boolean(result.scoped);
        const idleMsg =
          isScoped && scanned === 0
            ? 'SD refund cron: booking not found or not Ready for check-in'
            : isScoped
              ? `SD refund cron: nothing updated (${scanned} checked). Either we're still outside the automated window before check-out, or the check-out email was already sent and final balance isn't settled yet.`
              : `SD refund cron: no matching actions (${scanned} checked)`;
        toast.success(idleMsg);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'SD refund cron failed');
    }
  }

  async function handleResendSdFormEmail() {
    try {
      const result = await resendSdFormMut.mutateAsync();
      if (result.skipped) {
        toast.message('Skipped (test booking in production)');
      } else {
        toast.success('SD refund form email sent');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send email');
    }
  }

  // Pipeline navigation — the stepper + Proceed/Back buttons read from these.
  const pipeline = bookingPipeline(booking, status);
  const next = !isTerminal ? nextStep(booking, status) : null;
  const prev = !isTerminal ? previousStep(booking, status) : null;
  const inPendingDocuments = status === 'PENDING_DOCUMENTS';
  const pendingDocumentsComplete = arePendingDocumentsComplete(booking);
  const selectedPendingDocRequired = isSubStatusRequired(
    activePendingDocSubStatus,
    booking,
  );
  const selectedPendingDocCompleted = isSubStatusCompleted(
    activePendingDocSubStatus,
    booking,
  );
  const selectedPendingDocIsParking =
    activePendingDocSubStatus === 'PENDING_PARKING_REQUEST';
  const selectedPendingDocCanMarkComplete =
    selectedPendingDocRequired &&
    !selectedPendingDocCompleted &&
    (!selectedPendingDocIsParking ||
      isParkingRequestDraftComplete(parkingValues));
  const selectedPendingDocCanMarkIncomplete =
    selectedPendingDocRequired && selectedPendingDocCompleted;
  const isLiveView = isLiveWorkflowView(viewedStep, status, booking);
  const contentReadOnly =
    !isLiveView || status === 'COMPLETED' || status === 'CANCELLED';
  const viewedContent = workflowContentForView(viewedStep, booking);
  const viewingPendingDocSub = viewedStep.kind === 'pending-doc-sub';

  const canShowLateParkingForm =
    isLiveView &&
    viewingPendingDocSub &&
    activePendingDocSubStatus === 'PENDING_PARKING_REQUEST' &&
    !inPendingDocuments &&
    canNavigatePendingParkingSubStep(booking, status);
  const showLateParkingActions = canShowLateParkingForm;
  const returnToLiveStep = useCallback(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking));
  }, [status, booking]);

  const showProceedToReadyForCheckin =
    isLiveView && inPendingDocuments && viewingPendingDocSub;
  const livePipelineActions =
    isLiveView && viewedStep.kind === 'pipeline' && !inPendingDocuments;

  const transitionConfirmDevControls = confirm
    ? workflowDevControlsForTransition(status, confirm.toStatus, booking)
    : [];
  const cancelConfirmDevControls = workflowDevControlsForCancel();

  // ─── Sub-form helpers ────────────────────────────────────────────────────

  function buildPayload(toStatus: BookingStatus): TransitionPayload {
    const subForm = requiredSubForm(status, toStatus);
    if (subForm === 'pricing' && pricingValues) {
      const base = {
        booking_rate: pricingValues.booking_rate,
        down_payment: pricingValues.down_payment,
        security_deposit: pricingValues.security_deposit,
        pet_fee: booking.has_pets === true ? pricingValues.pet_fee : 0,
        parking_rate_guest:
          booking.need_parking === true ? pricingValues.parking_rate_guest : 0,
        guest_additional_fee: pricingValues.guest_additional_fee,
      };
      if (booking.guest_requests_surprise_decor && surpriseDecorStaffAck) {
        return {
          ...base,
          surprise_decor_staff_acknowledged: true,
        };
      }
      return base;
    }
    if (subForm === 'parking' && parkingValues) {
      return {
        parking_owner: parkingValues.parking_owner.trim() || null,
        parking_rate_paid: parkingValues.parking_rate_paid,
        parking_endorsement_url: parkingValues.parking_endorsement_url || null,
      };
    }
    if (subForm === 'sd_refund' && sdRefundValues) {
      return {
        sd_additional_expenses: sdRefundValues.sd_additional_expense_items.map(
          (r) => Number(r.amount) || 0,
        ),
        sd_additional_profits: sdRefundValues.sd_additional_profit_items.map(
          (r) => Number(r.amount) || 0,
        ),
        sd_refund_amount: sdRefundValues.sd_refund_amount,
        sd_refund_receipt_url: sdRefundValues.sd_refund_receipt_url || null,
      };
    }
    if (subForm === 'guest_balance' && guestBalanceValues) {
      return {
        guest_balance_paid_amount: guestBalanceValues.guest_balance_paid_amount,
        guest_balance_payment_receipt_url:
          guestBalanceValues.guest_balance_payment_receipt_url || null,
      };
    }
    return {};
  }

  function isTransitionDisabled(toStatus: BookingStatus): boolean {
    const subForm = requiredSubForm(status, toStatus);
    if (subForm === 'pricing') {
      if (pricingValues === null) return true;
      if (booking.guest_requests_surprise_decor && !surpriseDecorStaffAck) {
        return true;
      }
      return false;
    }
    if (subForm === 'parking')
      return !isParkingRequestDraftComplete(parkingValues);
    if (subForm === 'sd_refund') return sdRefundValues === null;
    if (subForm === 'guest_balance') return guestBalanceValues === null;
    return false;
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  function openForwardProceedConfirm(toStatus: BookingStatus, label: string) {
    setConfirm({
      toStatus,
      label,
      pastStayWarning: shouldWarnPastBookingStayForProceed(status, booking),
    });
  }

  async function handleTransition(toStatus: BookingStatus) {
    const flags = commitModalDevControls();
    setConfirm(null);
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus,
        payload: buildPayload(toStatus),
        devControls: flags,
        manual: true,
      });
      toast.success(`Booking moved to: ${statusLabel(toStatus)}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Transition failed');
    }
  }

  async function handleMarkPendingDocSubStatusComplete(
    subStatus: PendingDocumentSubStatus,
  ) {
    try {
      const payload: TransitionPayload = {
        document_completion_target: subStatus,
      };
      if (
        subStatus === 'PENDING_PARKING_REQUEST' &&
        parkingValues &&
        isParkingRequestDraftComplete(parkingValues)
      ) {
        payload.parking_owner = parkingValues.parking_owner.trim() || null;
        payload.parking_rate_paid = parkingValues.parking_rate_paid;
        payload.parking_endorsement_url =
          parkingValues.parking_endorsement_url || null;
      }
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload,
        devControls: sessionDevControls,
        manual: true,
      });
      toast.success(`Marked ${statusLabel(subStatus)} as complete`);
      if (!inPendingDocuments) {
        focusPipelineView();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to mark sub-status complete');
    }
  }

  async function handleMarkPendingDocSubStatusIncomplete(
    subStatus: PendingDocumentSubStatus,
  ) {
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload: { document_completion_clear_target: subStatus },
        devControls: sessionDevControls,
        manual: true,
      });
      toast.success(`Marked ${statusLabel(subStatus)} as incomplete`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to mark sub-status incomplete');
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
      toast.error(err?.message ?? 'Cancel failed');
    }
  }

  // ─── Sub-form visibility ─────────────────────────────────────────────────

  const needsPricing = viewedContent === 'pricing';
  const needsParking = viewedContent === 'parking';
  const needsSdRefund = viewedContent === 'sd_refund';
  const needsGuestBalance = viewedContent === 'guest_balance';
  const needsDocSubStatus = viewedContent === 'doc_sub_status';
  const showSdGuestInfoCard = viewedContent === 'sd_guest_info';
  const showStageContent =
    needsPricing ||
    needsParking ||
    needsSdRefund ||
    needsGuestBalance ||
    needsDocSubStatus ||
    showSdGuestInfoCard;

  return (
    <>
      <HistoricalApprovalBackfillDialog
        open={historicalBackfillOpen}
        onOpenChange={setHistoricalBackfillOpen}
        onDismiss={dismissHistoricalBackfillModal}
        bookingId={booking.id}
        variant="booking-detail"
        onRunSuccess={() => {
          pendingDocsAutoBackfillModalRef.current = null;
          try {
            sessionStorage.removeItem(
              historicalBackfillDismissStorageKey(booking.id),
            );
          } catch {
            /* ignore */
          }
          void queryClient.invalidateQueries({
            queryKey: BOOKING_QUERY_KEY(booking.id),
          });
        }}
      />
      <aside className="flex overflow-hidden flex-col gap-0 rounded-xl border shadow-sm bg-card border-border">
        {/* ── Pipeline stepper ──────────────────────────────────────────────── */}
        {pipeline.length > 0 && status !== 'CANCELLED' ? (
          <div className="px-4 py-4 border-b border-separator">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
              <p className="text-overline">Progress</p>
              <StatusBadge status={booking.status} />
            </div>
            <PipelineStepper
              pipeline={pipeline}
              currentStatus={status}
              statusUpdatedAt={booking.status_updated_at}
              booking={booking}
              viewedStep={viewedStep}
              onSelectPipelineStep={selectPipelineStep}
              onSelectPendingDocSubStatus={focusPendingDocSubView}
              transitionPending={transitionMut.isPending}
            />
          </div>
        ) : status === 'CANCELLED' ? (
          <div className="px-4 py-4 border-b border-separator">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <p className="text-overline">Status</p>
              <StatusBadge status={booking.status} />
            </div>
          </div>
        ) : null}

        {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
        {showStageContent && (
          <div className="px-4 py-4 space-y-6 border-b border-separator">
            {contentReadOnly ? (
              <div
                role="status"
                className="flex gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-500/30 dark:bg-blue-950/40 sm:gap-3 sm:px-4 sm:py-3"
              >
                <Info
                  className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400 sm:size-[18px]"
                  aria-hidden
                />
                <p className="min-w-0 text-[12px] leading-snug text-blue-950 dark:text-blue-100 sm:text-[13px]">
                  Quick view of previously completed steps is read-only. To make
                  changes to them, use the{' '}
                  <span className="font-semibold">Edit Booking Details</span>{' '}
                  section.
                </p>
              </div>
            ) : null}
            {showSdGuestInfoCard && (
              <WorkflowSubFormCard title="Guest SD refund form">
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  We are just waiting for the guest to fill out the SD Refund
                  form. Once they submit it, this booking will automatically
                  move to{' '}
                  <span className="font-medium text-foreground">
                    Pending SD Refund
                  </span>{' '}
                  status.
                </p>
                <div>
                  <span className="inline-flex flex-wrap gap-x-1 gap-y-1 items-center max-w-full">
                    <a
                      href={sdGuestFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={workflowInlineLink}
                    >
                      SD Refund Link
                    </a>
                    <InlineCopyIconButton
                      aria-label="Copy SD refund form link to clipboard"
                      onClick={() => void copySdGuestFormUrl()}
                    />
                  </span>
                </div>
                <button
                  type="button"
                  disabled={recheckSdGuestSubmitPending}
                  onClick={() => void recheckGuestSdSubmission()}
                  className={cn(
                    workflowNeutralActionClass(),
                    'gap-2 justify-center',
                  )}
                >
                  {recheckSdGuestSubmitPending ? (
                    <Loader2
                      className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : (
                    <RefreshCw
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  Check for guest submission
                </button>
              </WorkflowSubFormCard>
            )}
            {needsDocSubStatus && (
              <PendingDocSubStatusCard
                booking={booking}
                sub={activePendingDocSubStatus}
              />
            )}
            {needsPricing && (
              <>
                <ReviewPricingForm
                  key={`${booking.id}-pricing-sd-${booking.guest_requests_surprise_decor ? 1 : 0}`}
                  booking={booking}
                  initialDraft={pricingValues}
                  onChange={setPricingValues}
                  readOnly={contentReadOnly}
                />
                {booking.guest_requests_surprise_decor ? (
                  <SurpriseDecorAckCard
                    acknowledged={surpriseDecorStaffAck}
                    onAcknowledgedChange={setSurpriseDecorStaffAck}
                    readOnly={contentReadOnly}
                  />
                ) : null}
              </>
            )}
            {needsParking && (
              <ParkingRequestForm
                booking={booking}
                initialDraft={parkingValues}
                onChange={setParkingValues}
                readOnly={contentReadOnly}
              />
            )}
            {needsGuestBalance && (
              <GuestBalanceSettlementForm
                booking={booking}
                initialDraft={guestBalanceValues}
                onChange={setGuestBalanceValues}
                readOnly={contentReadOnly}
              />
            )}
            {needsSdRefund && (
              <SdRefundForm
                booking={booking}
                initialDraft={sdRefundValues}
                onChange={setSdRefundValues}
                readOnly={contentReadOnly}
              />
            )}
          </div>
        )}

        {/* ── Automation triggers (Q6.6) ───────────────────────────────────── */}
        {(showGmailPoll || showSdCron || showSdFormResend) && (
          <div className="border-b border-separator">
            <button
              type="button"
              aria-expanded={automationHelpOpen}
              onClick={() => setAutomationHelpOpen((o) => !o)}
              className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="flex flex-1 gap-2 items-center min-w-0">
                <Timer
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="font-semibold text-overline text-muted-foreground">
                  Automation Triggers
                </span>
              </span>
              {automationHelpOpen ? (
                <ChevronDown
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
            </button>

            {automationHelpOpen && (
              <div className="space-y-2 px-4 pb-3 text-[11.5px] leading-relaxed text-muted-foreground">
                {showSdCron ? (
                  <>
                    <p className="text-muted-foreground">
                      Two hours before the check-out time, we will send an email
                      to the guest regarding the{' '}
                      <span className="font-medium text-muted-foreground">
                        Check-out and Security-deposit refund details
                      </span>
                      . That email will still send even we haven&apos;t settle
                      the guest balance but is required to move the booking to{' '}
                      <span className="font-medium text-muted-foreground">
                        Ready for check-out
                      </span>{' '}
                      status .
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-muted-foreground">
                        Run SD refund cron
                      </span>{' '}
                      runs the checks for{' '}
                      <span className="font-medium text-muted-foreground">
                        this booking only
                      </span>
                      . The same checks also run automatically in the background
                      for{' '}
                      <span className="font-medium text-muted-foreground">
                        other bookings
                      </span>{' '}
                      that's still at 'Ready for Check-in' status.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-muted-foreground">
                        Send SD refund form email
                      </span>{' '}
                      only sends the email again in case the guest didn't
                      receive it. This does{' '}
                      <span className="font-medium text-muted-foreground">
                        not
                      </span>{' '}
                      change booking status automatically.
                    </p>
                  </>
                ) : showGmailPoll ? (
                  <>
                    <p className="text-muted-foreground">
                      Use this if approval emails from the inbox look stuck.
                      Shown while this booking is waiting on documents from the
                      pipeline.
                    </p>
                    <ol className="list-decimal space-y-1.5 pl-4 marker:text-muted-foreground">
                      <li>
                        <span className="font-medium text-muted-foreground">
                          Run Gmail poll now
                        </span>{' '}
                        — checks the inbox for{' '}
                        <strong className="font-semibold text-muted-foreground">
                          every
                        </strong>{' '}
                        booking that might be waiting on that kind of reply, not
                        just this one. Safe to run more than once.
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-muted-foreground">
                        Send SD refund form email
                      </span>{' '}
                      mails the check-out and security-deposit link to the guest
                      again—for example they missed it or you need a manual
                      resend. It does not move the booking to the next step; it
                      only sends the message.
                    </p>
                  </>
                )}

                <div className="flex flex-col gap-1.5 border-t border-separator pt-3">
                  {showGmailPoll && (
                    <button
                      type="button"
                      disabled={gmailPollMut.isPending}
                      onClick={handleGmailPoll}
                      className={workflowNeutralActionClass()}
                    >
                      <span>Run Gmail poll now</span>
                      {gmailPollMut.isPending ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  )}
                  {showHistoricalBackfill && (
                    <button
                      type="button"
                      onClick={() => {
                        pendingDocsAutoBackfillModalRef.current = null;
                        try {
                          sessionStorage.removeItem(
                            historicalBackfillDismissStorageKey(booking.id),
                          );
                        } catch {
                          /* ignore */
                        }
                        setHistoricalBackfillOpen(true);
                      }}
                      className="flex min-h-[44px] w-full items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100"
                    >
                      <span>Historical approval backfill</span>
                      <History className="size-3.5 shrink-0" aria-hidden />
                    </button>
                  )}
                  {showSdCron && (
                    <button
                      type="button"
                      disabled={sdCronMut.isPending}
                      onClick={handleSdCron}
                      className={workflowNeutralActionClass()}
                    >
                      <span>Run SD refund cron</span>
                      {sdCronMut.isPending ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  )}
                  {showSdFormResend && (
                    <button
                      type="button"
                      disabled={resendSdFormMut.isPending}
                      onClick={handleResendSdFormEmail}
                      className={workflowNeutralActionClass()}
                    >
                      <span>Send SD refund form email</span>
                      {resendSdFormMut.isPending ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Transition actions ────────────────────────────────────────────── */}
        {!isTerminal && (
          <div className="px-4 py-4">
            {!isLiveView ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={transitionMut.isPending}
                  onClick={returnToLiveStep}
                  className={workflowPrimaryActionClass(
                    !transitionMut.isPending,
                  )}
                >
                  <span className="pr-2 min-w-0 text-left">
                    Return to {statusLabel(status)}
                  </span>
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-overline">Actions</p>
                {inPendingDocuments && viewingPendingDocSub && (
                  <>
                    {prev && (
                      <button
                        disabled={transitionMut.isPending}
                        onClick={() =>
                          setConfirm({
                            toStatus: prev,
                            label: `Back to ${statusLabel(prev)}`,
                          })
                        }
                        className={workflowBackActionClass()}
                      >
                        <span className="pr-2 min-w-0 text-left">
                          Back to {statusLabel(prev)}
                        </span>
                        {transitionMut.isPending ? (
                          <Loader2 className="animate-spin size-4 shrink-0" />
                        ) : (
                          <ArrowLeft className="size-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    )}
                    <div className="flex flex-col gap-2">
                      {selectedPendingDocCanMarkIncomplete ? (
                        <button
                          type="button"
                          disabled={transitionMut.isPending}
                          onClick={() =>
                            handleMarkPendingDocSubStatusIncomplete(
                              activePendingDocSubStatus,
                            )
                          }
                          className={workflowWarningActionClass()}
                        >
                          <span className="pr-2 min-w-0 text-left">
                            Mark as Incomplete -{' '}
                            {statusLabel(activePendingDocSubStatus)}
                          </span>
                          {transitionMut.isPending ? (
                            <Loader2 className="text-amber-700 animate-spin size-4 shrink-0" />
                          ) : (
                            <RotateCcw
                              className="text-amber-700 size-4 shrink-0"
                              aria-hidden
                            />
                          )}
                        </button>
                      ) : !selectedPendingDocRequired ? (
                        <p className="flex min-h-[44px] items-center rounded-xl border border-border/50 bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
                          {statusLabel(activePendingDocSubStatus)} is not
                          required for this booking.
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            !selectedPendingDocCanMarkComplete ||
                            transitionMut.isPending
                          }
                          onClick={() =>
                            handleMarkPendingDocSubStatusComplete(
                              activePendingDocSubStatus,
                            )
                          }
                          className={workflowPrimaryActionClass(
                            selectedPendingDocCanMarkComplete &&
                              !transitionMut.isPending,
                          )}
                        >
                          <span className="pr-2 min-w-0 text-left">
                            Mark as Complete -{' '}
                            {statusLabel(activePendingDocSubStatus)}
                          </span>
                          {transitionMut.isPending ? (
                            <Loader2 className="animate-spin size-4 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )}
                        </button>
                      )}
                    </div>
                    {showProceedToReadyForCheckin && (
                      <button
                        disabled={
                          !pendingDocumentsComplete || transitionMut.isPending
                        }
                        onClick={() =>
                          openForwardProceedConfirm(
                            'READY_FOR_CHECKIN',
                            'Proceed to Ready for Check-in',
                          )
                        }
                        className={workflowPrimaryActionClass(
                          pendingDocumentsComplete && !transitionMut.isPending,
                        )}
                      >
                        <span className="pr-2 min-w-0 text-left">
                          Proceed to Ready for Check-in
                        </span>
                        {transitionMut.isPending ? (
                          <Loader2 className="animate-spin size-4 shrink-0" />
                        ) : (
                          <ChevronRight
                            className="size-4 shrink-0"
                            aria-hidden
                          />
                        )}
                      </button>
                    )}
                  </>
                )}

                {showLateParkingActions && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={
                        !selectedPendingDocCanMarkComplete ||
                        transitionMut.isPending
                      }
                      onClick={() =>
                        handleMarkPendingDocSubStatusComplete(
                          'PENDING_PARKING_REQUEST',
                        )
                      }
                      className={workflowPrimaryActionClass(
                        selectedPendingDocCanMarkComplete &&
                          !transitionMut.isPending,
                      )}
                    >
                      <span className="pr-2 min-w-0 text-left">
                        Mark as Complete -{' '}
                        {statusLabel('PENDING_PARKING_REQUEST')}
                      </span>
                      {transitionMut.isPending ? (
                        <Loader2 className="animate-spin size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0" />
                      )}
                    </button>
                  </div>
                )}

                {/* Backward — secondary recovery action. */}
                {livePipelineActions && prev && (
                  <button
                    disabled={transitionMut.isPending}
                    onClick={() =>
                      setConfirm({
                        toStatus: prev,
                        label: `Back to ${statusLabel(prev)}`,
                      })
                    }
                    className={workflowBackActionClass()}
                  >
                    <span className="pr-2 min-w-0 text-left">
                      Back to {statusLabel(prev)}
                    </span>
                    {transitionMut.isPending ? (
                      <Loader2 className="animate-spin size-4 shrink-0" />
                    ) : (
                      <ArrowLeft className="size-4 shrink-0" aria-hidden />
                    )}
                  </button>
                )}

                {/* Forward — primary CTA. */}
                {livePipelineActions && next && (
                  <button
                    disabled={
                      isTransitionDisabled(next) || transitionMut.isPending
                    }
                    onClick={() =>
                      openForwardProceedConfirm(
                        next,
                        `Proceed to ${statusLabel(next)}`,
                      )
                    }
                    className={workflowPrimaryActionClass(
                      !isTransitionDisabled(next) && !transitionMut.isPending,
                    )}
                  >
                    <span className="pr-2 min-w-0 text-left">
                      Proceed to {statusLabel(next)}
                    </span>
                    {transitionMut.isPending ? (
                      <Loader2 className="animate-spin size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" aria-hidden />
                    )}
                  </button>
                )}

                <button
                  disabled={cancelMut.isPending}
                  onClick={() => setCancelConfirm(true)}
                  className={workflowDestructiveActionClass()}
                >
                  <span className="pr-2 min-w-0 text-left">Cancel Booking</span>
                  <X className="size-4 shrink-0" aria-hidden />
                </button>

                {!inPendingDocuments && !next && !prev && (
                  <p className="text-caption text-muted-foreground">
                    No further pipeline steps are available for this booking.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Confirm transition modal ─────────────────────────────────────── */}
        {confirm && (
          <ConfirmModal
            title={confirm.label}
            secondaryLabel="Cancel"
            banner={
              confirm.pastStayWarning ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="font-semibold">Stay dates are in the past</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900/95 dark:text-amber-200/90">
                    At least one of check-in (
                    {formatBookingDate(booking.check_in_date)}) or check-out (
                    {formatBookingDate(booking.check_out_date)}) is before
                    today’s calendar date in Asia/Manila. Only continue if you
                    still intend to advance this booking.
                  </p>
                </div>
              ) : null
            }
            description={`Transition from "${statusLabel(status)}" to "${statusLabel(confirm.toStatus)}". Uncheck any side effect you want to skip for this action.`}
            devControls={transitionConfirmDevControls}
            devControlValues={modalDevControls}
            onDevControlToggle={toggleModalDevControl}
            onConfirm={() => handleTransition(confirm.toStatus)}
            onCancel={() => setConfirm(null)}
            isLoading={transitionMut.isPending}
          />
        )}

        {cancelConfirm && (
          <ConfirmModal
            title="Cancel Booking"
            secondaryLabel="Keep booking"
            description="This will mark the booking as CANCELLED. Uncheck any integration you want to skip. Guest data is preserved. This cannot be undone."
            devControls={cancelConfirmDevControls}
            devControlValues={modalDevControls}
            onDevControlToggle={toggleModalDevControl}
            onConfirm={handleCancel}
            onCancel={() => setCancelConfirm(false)}
            isLoading={cancelMut.isPending}
            destructive
          />
        )}
      </aside>
    </>
  );
}

// ─── Pipeline stepper ─────────────────────────────────────────────────────────
//
// Vertical stepper for the booking's applicable pipeline. Completed and current
// steps are clickable to preview saved data (read-only when not the live step).
// Future steps stay disabled. Proceed / Back actions remain in the ACTIONS section.

function isPipelineStepSelected(
  step: BookingStatus,
  viewedStep: ViewedWorkflowStep,
): boolean {
  if (step === 'PENDING_DOCUMENTS') {
    return viewedStep.kind === 'pending-doc-sub';
  }
  return viewedStep.kind === 'pipeline' && viewedStep.status === step;
}

function PipelineStepper({
  pipeline,
  currentStatus,
  statusUpdatedAt,
  booking,
  viewedStep,
  onSelectPipelineStep,
  onSelectPendingDocSubStatus,
  transitionPending,
}: {
  pipeline: BookingStatus[];
  currentStatus: BookingStatus;
  statusUpdatedAt?: string | null;
  booking: BookingRow;
  viewedStep: ViewedWorkflowStep;
  onSelectPipelineStep: (step: BookingStatus) => void;
  onSelectPendingDocSubStatus: (status: PendingDocumentSubStatus) => void;
  transitionPending: boolean;
}) {
  const currentIdx = pipeline.indexOf(currentStatus);
  const pendingDocsIdx = pipeline.indexOf('PENDING_DOCUMENTS');
  const pendingDocsBrowsable =
    pendingDocsIdx >= 0 &&
    currentIdx >= pendingDocsIdx &&
    currentStatus !== 'CANCELLED';

  return (
    <ol className="flex flex-col">
      {pipeline.map((step, i) => {
        const isCompleted = currentIdx >= 0 && i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === pipeline.length - 1;
        const isReachable = isCompleted || isCurrent;
        const isSelected = isPipelineStepSelected(step, viewedStep);

        const labelClass = cn(
          'text-sm leading-tight transition-colors',
          isSelected
            ? 'font-semibold text-primary'
            : isCurrent
              ? 'font-semibold text-primary'
              : isCompleted
                ? 'font-medium text-foreground'
                : 'font-medium text-muted-foreground',
        );

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center w-6 shrink-0">
              <div className="flex justify-center items-center size-6 shrink-0">
                <div
                  className={cn(
                    'flex justify-center items-center rounded-full transition-colors',
                    isCurrent
                      ? 'ring-2 size-6 bg-primary/10 ring-primary'
                      : isCompleted
                        ? 'size-5 bg-primary text-primary-foreground'
                        : 'ring-1 size-5 bg-card ring-border/60',
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="rounded-full size-2 bg-primary" />
                  ) : null}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-0.5 mb-0.5 w-px flex-1 min-h-[14px]',
                    isCompleted ? 'bg-primary/30' : 'bg-muted',
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                'flex flex-col flex-1 gap-3',
                isLast ? 'pb-0' : 'pb-3',
              )}
            >
              <div className="flex items-center min-h-6">
                {isReachable ? (
                  <button
                    type="button"
                    disabled={!!transitionPending}
                    onClick={() => {
                      if (!transitionPending) onSelectPipelineStep(step);
                    }}
                    className={cn(
                      'inline-flex min-h-[44px] w-full items-center py-2 text-left leading-tight transition-colors -my-[10px]',
                      transitionPending
                        ? 'cursor-not-allowed text-muted-foreground'
                        : labelClass,
                      !transitionPending && !isSelected && isCompleted
                        ? 'hover:text-primary'
                        : null,
                    )}
                    aria-label={`View ${statusLabel(step)}`}
                    aria-current={isSelected ? 'step' : undefined}
                  >
                    {statusLabel(step)}
                  </button>
                ) : (
                  <div className={labelClass}>{statusLabel(step)}</div>
                )}
              </div>
              {step === 'PENDING_DOCUMENTS' && pendingDocsBrowsable && (
                <PendingDocumentsSubTree
                  booking={booking}
                  viewedStep={viewedStep}
                  onSelect={onSelectPendingDocSubStatus}
                  transitionPending={transitionPending}
                  currentStatus={currentStatus}
                  currentIdx={currentIdx}
                  pendingDocsIdx={pendingDocsIdx}
                />
              )}
              {isCurrent && statusUpdatedAt && (
                <div className="mt-0.5 text-caption">
                  Since {formatRelative(statusUpdatedAt)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PendingDocumentsSubTree({
  booking,
  className,
  viewedStep,
  onSelect,
  transitionPending,
  currentStatus,
  currentIdx,
  pendingDocsIdx,
}: {
  booking: BookingRow;
  className?: string;
  viewedStep: ViewedWorkflowStep;
  onSelect?: (status: PendingDocumentSubStatus) => void;
  transitionPending?: boolean;
  currentStatus: BookingStatus;
  currentIdx: number;
  pendingDocsIdx: number;
}) {
  const allStatuses: PendingDocumentSubStatus[] = [
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
  ];

  const statuses = allStatuses.filter((s) => isSubStatusRequired(s, booking));
  const activeStatus =
    viewedStep.kind === 'pending-doc-sub' ? viewedStep.sub : undefined;
  const isLivePendingDocs = currentStatus === 'PENDING_DOCUMENTS';
  const canBrowseCompletedPendingDocs =
    pendingDocsIdx >= 0 && currentIdx > pendingDocsIdx;

  function isSubStepInteractive(sub: PendingDocumentSubStatus): boolean {
    if (isLivePendingDocs) return true;
    if (canBrowseCompletedPendingDocs) return true;
    if (
      sub === 'PENDING_PARKING_REQUEST' &&
      canNavigatePendingParkingSubStep(booking, currentStatus)
    ) {
      return true;
    }
    return false;
  }

  return (
    <ul className={cn('flex relative flex-col gap-3', className)}>
      {statuses.length > 1 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[10px] left-2 top-[10px] w-px bg-muted"
        />
      ) : null}
      {statuses.map((sub) => {
        const completed = isSubStatusCompletedInStepper(booking, sub);
        const isActive = activeStatus === sub;
        const subInteractive = isSubStepInteractive(sub);

        const iconClass = cn(
          'relative z-[1] flex size-4 shrink-0 items-center justify-center rounded-full box-border',
          completed
            ? 'bg-primary text-primary-foreground'
            : 'border border-border/60 bg-card',
        );

        const labelClass = cn(
          'text-xs leading-4 transition-colors',
          transitionPending
            ? 'cursor-not-allowed text-muted-foreground'
            : isActive
              ? 'font-semibold text-primary'
              : completed
                ? 'font-medium text-foreground'
                : 'font-medium text-muted-foreground',
          subInteractive &&
            !transitionPending &&
            !isActive &&
            'hover:text-primary',
        );

        return (
          <li key={sub} className="flex items-center gap-2.5">
            <div className={iconClass}>
              {completed ? (
                <Check className="size-2.5" strokeWidth={3} />
              ) : null}
            </div>

            {subInteractive ? (
              <div className="flex flex-1 gap-3 justify-between items-center min-w-0 min-h-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!transitionPending) onSelect?.(sub);
                  }}
                  disabled={!!transitionPending}
                  className={cn(
                    'inline-flex flex-1 items-center py-2 min-w-0 text-left min-h-[44px] -my-[10px]',
                    labelClass,
                  )}
                  aria-label={`View ${statusLabel(sub)}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {statusLabel(sub)}
                </button>
                <span
                  className={cn(
                    'text-xs font-semibold leading-4 shrink-0',
                    completed ? 'text-primary' : 'text-amber-600',
                  )}
                >
                  {completed ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'flex flex-1 items-center text-xs leading-4 min-h-6',
                  completed
                    ? 'font-medium text-emerald-700'
                    : 'text-muted-foreground',
                )}
              >
                {statusLabel(sub)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PendingDocSubStatusCard({
  booking,
  sub,
}: {
  booking: BookingRow;
  sub: PendingDocumentSubStatus;
}) {
  const completed = isSubStatusCompleted(sub, booking);
  const isGaf = sub === 'PENDING_GAF';
  const isPet = sub === 'PENDING_PET_REQUEST';

  return (
    <WorkflowSubFormCard title={statusLabel(sub)}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <span className="text-xs text-muted-foreground">Status</span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              completed
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            {completed ? 'Complete' : 'Incomplete'}
          </span>
        </div>

        {isGaf ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {completed
                ? 'Azure returned an approved GAF. The booking sub-step is marked complete.'
                : 'Waiting for Azure to return an approved GAF. Use Run Gmail poll in Automation triggers if an approval email was missed.'}
            </p>
            <DocLinkRow
              label="GAF request PDF"
              url={booking.gaf_request_pdf_url}
            />
            <DocLinkRow
              label="Approved GAF"
              url={booking.approved_gaf_pdf_url}
            />
            <DocLinkRow label="Guest valid ID" url={booking.valid_id_url} />
          </div>
        ) : null}

        {isPet ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {completed
                ? 'Azure returned an approved pet request. The booking sub-step is marked complete.'
                : 'Waiting for Azure to return an approved pet request. Use Run Gmail poll in Automation triggers if an approval email was missed.'}
            </p>
            <DocLinkRow
              label="Pet request PDF"
              url={booking.pet_request_pdf_url}
            />
            <DocLinkRow
              label="Approved pet request"
              url={booking.approved_pet_pdf_url}
            />
            <DocLinkRow
              label="Pet vaccination"
              url={booking.pet_vaccination_url}
            />
            <DocLinkRow label="Pet photo" url={booking.pet_image_url} />
          </div>
        ) : null}
      </div>
    </WorkflowSubFormCard>
  );
}

function DocLinkRow({ label, url }: { label: string; url?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2 justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(workflowInlineLink, 'inline-flex gap-1 items-center')}
        >
          View
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </a>
      ) : (
        <span className="italic text-muted-foreground">Not available</span>
      )}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  banner,
  devControls = [],
  devControlValues,
  onDevControlToggle,
  secondaryLabel = 'Back',
  onConfirm,
  onCancel,
  isLoading,
  destructive = false,
}: {
  title: string;
  description: string;
  banner?: ReactNode;
  devControls?: WorkflowDevControlDef[];
  devControlValues?: DevControlFlags;
  onDevControlToggle?: (key: keyof DevControlFlags) => void;
  /** Dismiss control (e.g. `Cancel` for transitions, `Keep booking` when cancelling a booking). */
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  destructive?: boolean;
}) {
  if (typeof document === 'undefined') return null;

  const showDevControls =
    devControls.length > 0 && devControlValues && onDevControlToggle;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="flex max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full max-w-[min(calc(100vw-1.5rem),28rem)] flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-3 items-start">
            {destructive && (
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="text-rose-600 size-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                {title}
              </h3>
              {banner ? <div className="mt-3">{banner}</div> : null}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              {showDevControls ? (
                <WorkflowDevControlsChecklist
                  controls={devControls}
                  values={devControlValues}
                  onToggle={onDevControlToggle}
                  disabled={isLoading}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-4 mt-5 border-t shrink-0 border-separator">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'min-h-[44px] rounded-xl px-5 py-2 text-sm font-bold transition-all duration-200 disabled:opacity-50 motion-safe:active:scale-[0.98]',
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20'
                : 'gradient-primary text-primary-foreground shadow-soft hover:brightness-[1.03] hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]',
            )}
          >
            {isLoading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
