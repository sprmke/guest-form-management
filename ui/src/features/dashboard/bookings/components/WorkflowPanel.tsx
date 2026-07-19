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
 * Plan: docs/planning/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 * Auth: admin-auth.mdc §5 (Dev controls panel)
 */

import { formatRelative } from '@/utils/format/bookingDisplay';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Timer,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { useGmailReconnectPrompt } from '@/features/dashboard/bookings/components/GmailReconnectProvider';
import {
  GuestBalanceSettlementForm,
  type GuestBalanceSettlementValues,
} from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import { InlineCopyIconButton } from '@/features/dashboard/bookings/components/InlineCopyIconButton';
import {
  ParkingRequestForm,
  isParkingRequestDraftComplete,
  type ParkingRequestValues,
} from '@/features/dashboard/bookings/components/ParkingRequestForm';
import {
  ReviewPricingForm,
  type ReviewPricingFormValues,
} from '@/features/dashboard/bookings/components/ReviewPricingForm';
import {
  SdRefundForm,
  type SdRefundValues,
} from '@/features/dashboard/bookings/components/SdRefundForm';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { SurpriseDecorAckCard } from '@/features/dashboard/bookings/components/SurpriseDecorAckCard';
import { WorkflowDevControlsChecklist } from '@/features/dashboard/bookings/components/WorkflowDevControlsChecklist';
import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';
import { shouldWarnPastBookingStayForProceed } from '@/features/dashboard/bookings/lib/bookingPastPipelineManila';
import {
  loadPersistedWorkflowDevControls,
  mergeWorkflowDevControlsWithDefaults,
  persistWorkflowDevControls,
  workflowDevControlsForCancel,
  workflowDevControlsForTransition,
  type WorkflowDevControlDef,
} from '@/features/dashboard/bookings/lib/workflowDevControls';
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
import { BOOKING_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBooking';
import {
  TERMINAL_STATUSES,
  isStayGuideEligibleStatus,
  statusLabel,
  type BookingStatus,
} from '@/features/dashboard/bookings/lib/bookingStatus';

import {
  isStorageObjectNotFoundError,
  normalizeStoragePublicUrl,
  parseStorageUrl,
  PRIVATE_STORAGE_BUCKETS,
  resolveAssetUrlForBrowser,
} from '@/features/dashboard/bookings/lib/storageUrls';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { guestSdFormPath, guestStayGuidePath } from '@/features/guest/lib/guestPublicPaths';
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
} from '@/features/dashboard/bookings/lib/workflow';
import {
  workflowBackActionClass,
  workflowDestructiveActionClass,
  workflowInlineLink,
  workflowNeutralActionClass,
  workflowPrimaryActionClass,
  workflowWarningActionClass,
} from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import { usePropertyPricingDefaults } from '@/features/dashboard/pricing/hooks/usePropertyPricing';

import {
  friendlyToastError,
  gmailPollSuccessMessage,
  sdRefundCronSuccessMessage,
} from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

/** Shared copy for manual “Run Gmail poll” and auto-poll on Pending Documents load. */
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
  const { propertySlug } = useOrgContext();
  const isModal = variant === 'modal';
  const formVariant = isModal ? 'modal' : 'workflow';
  const queryClient = useQueryClient();
  const {
    defaults: propertyPricingDefaults,
    data: propertyPricingData,
    isFetched: propertyPricingLoaded,
  } = usePropertyPricingDefaults();
  const status = booking.status as BookingStatus;
  const isTerminal = TERMINAL_STATUSES.has(status);

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

  // Sub-form state
  const [pricingValues, setPricingValues] = useState<ReviewPricingFormValues | null>(null);
  const [surpriseDecorStaffAck, setSurpriseDecorStaffAck] = useState(
    () => !!booking.surprise_decor_staff_acknowledged
  );

  useEffect(() => {
    setSurpriseDecorStaffAck(!!booking.surprise_decor_staff_acknowledged);
  }, [booking.id, booking.surprise_decor_staff_acknowledged]);
  const [parkingValues, setParkingValues] = useState<ParkingRequestValues | null>(null);
  const [sdRefundValues, setSdRefundValues] = useState<SdRefundValues | null>(null);
  const [guestBalanceValues, setGuestBalanceValues] = useState<GuestBalanceSettlementValues | null>(
    null
  );
  const [viewedStep, setViewedStep] = useState<ViewedWorkflowStep>(() =>
    initialViewedWorkflowStep(status, booking)
  );

  const activePendingDocSubStatus =
    viewedStep.kind === 'pending-doc-sub' ? viewedStep.sub : defaultPendingDocSub(booking);

  useEffect(() => {
    setViewedStep(initialViewedWorkflowStep(status, booking));
  }, [booking.id, status, booking.need_parking, booking.has_pets]);

  const focusPipelineView = useCallback(() => {
    setViewedStep({ kind: 'pipeline', status });
  }, [status]);

  const focusPendingDocSubView = useCallback((sub: PendingDocumentSubStatus) => {
    setViewedStep({ kind: 'pending-doc-sub', sub });
  }, []);

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
    [booking]
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

  // Pipeline navigation — the stepper + Proceed/Back buttons read from these.
  const pipeline = bookingPipeline(booking, status);
  const next = !isTerminal ? nextStep(booking, status) : null;
  const prev = !isTerminal ? previousStep(booking, status) : null;
  const inPendingDocuments = status === 'PENDING_DOCUMENTS';
  const pendingDocumentsComplete = arePendingDocumentsComplete(booking);
  const selectedPendingDocRequired = isSubStatusRequired(activePendingDocSubStatus, booking);
  const selectedPendingDocCompleted = isSubStatusCompleted(activePendingDocSubStatus, booking);
  const selectedPendingDocIsParking = activePendingDocSubStatus === 'PENDING_PARKING_REQUEST';
  const selectedPendingDocCanMarkComplete =
    selectedPendingDocRequired &&
    !selectedPendingDocCompleted &&
    (!selectedPendingDocIsParking || isParkingRequestDraftComplete(parkingValues));
  const selectedPendingDocCanMarkIncomplete =
    selectedPendingDocRequired && selectedPendingDocCompleted;
  const isLiveView = isLiveWorkflowView(viewedStep, status, booking);
  const contentReadOnly = !isLiveView || status === 'COMPLETED' || status === 'CANCELLED';
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

  const showProceedToReadyForCheckin = isLiveView && inPendingDocuments && viewingPendingDocSub;
  const livePipelineActions = isLiveView && viewedStep.kind === 'pipeline' && !inPendingDocuments;

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
        parking_rate_guest: booking.need_parking === true ? pricingValues.parking_rate_guest : 0,
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
        parking_fee_included_in_downpayment: parkingValues.parking_fee_included_in_downpayment,
        parking_payment_receipt_url: parkingValues.parking_fee_included_in_downpayment
          ? null
          : parkingValues.parking_payment_receipt_url || null,
      };
    }
    if (subForm === 'sd_refund' && sdRefundValues) {
      return {
        sd_additional_expenses: sdRefundValues.sd_additional_expense_items.map(
          (r) => Number(r.amount) || 0
        ),
        sd_additional_profits: sdRefundValues.sd_additional_profit_items.map(
          (r) => Number(r.amount) || 0
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
    if (subForm === 'parking') return !isParkingRequestDraftComplete(parkingValues);
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
      toast.success(`Moved to ${statusLabel(toStatus)}`);
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not update booking status');
    }
  }

  async function handleMarkPendingDocSubStatusComplete(subStatus: PendingDocumentSubStatus) {
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
        payload.parking_endorsement_url = parkingValues.parking_endorsement_url || null;
        payload.parking_fee_included_in_downpayment =
          parkingValues.parking_fee_included_in_downpayment;
        payload.parking_payment_receipt_url = parkingValues.parking_fee_included_in_downpayment
          ? null
          : parkingValues.parking_payment_receipt_url || null;
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
    } catch (err: unknown) {
      toastUnlessGmailReconnect(err, 'Could not mark step complete');
    }
  }

  async function handleMarkPendingDocSubStatusIncomplete(subStatus: PendingDocumentSubStatus) {
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus: inPendingDocuments ? 'PENDING_DOCUMENTS' : status,
        payload: { document_completion_clear_target: subStatus },
        devControls: sessionDevControls,
        manual: true,
      });
      toast.success(`Marked ${statusLabel(subStatus)} as incomplete`);
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

  const PanelRoot = isModal ? 'div' : 'aside';

  return (
    <>
      <PanelRoot
        className={cn(
          'flex flex-col',
          isModal
            ? 'min-h-0 flex-1 overflow-hidden'
            : 'border-border bg-card gap-0 overflow-hidden rounded-xl border shadow-sm'
        )}
      >
        {/* ── Pipeline stepper (detail rail only) ───────────────────────────── */}
        {!isModal && pipeline.length > 0 && status !== 'CANCELLED' ? (
          <div className="border-separator border-b px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        ) : !isModal && status === 'CANCELLED' ? (
          <div className="border-separator border-b px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-overline">Status</p>
              <StatusBadge status={booking.status} />
            </div>
          </div>
        ) : null}

        {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
        {showStageContent && (
          <div
            className={cn(
              isModal
                ? 'min-h-0 flex-1 space-y-3 overflow-y-auto py-3'
                : 'border-separator space-y-6 border-b px-4 py-4'
            )}
          >
            {contentReadOnly && !isModal ? (
              <div
                role="status"
                className="border-primary/25 bg-primary/5 dark:border-primary/30 dark:bg-primary/10 flex gap-2.5 rounded-xl border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
              >
                <Info
                  className="text-primary dark:text-primary mt-0.5 size-4 shrink-0 sm:size-[18px]"
                  aria-hidden
                />
                <p className="text-foreground dark:text-foreground min-w-0 text-[12px] leading-snug sm:text-[13px]">
                  Completed steps are read-only here. Edit them in{' '}
                  <span className="font-semibold">Edit Booking Details</span>.
                </p>
              </div>
            ) : null}
            {showSdGuestInfoCard && (
              <WorkflowSubFormCard title="Guest SD refund form" plain={isModal}>
                <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                  Waiting for the guest SD refund form. Submitting moves this booking to{' '}
                  <span className="text-foreground font-medium">Pending SD Refund</span>.
                </p>
                <div>
                  <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1">
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
                  className={cn(workflowNeutralActionClass(), 'justify-center gap-2')}
                >
                  {recheckSdGuestSubmitPending ? (
                    <Loader2
                      className="text-muted-foreground size-3.5 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <RefreshCw className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  )}
                  Check for guest submission
                </button>
              </WorkflowSubFormCard>
            )}
            {needsDocSubStatus && (
              <PendingDocSubStatusCard
                booking={booking}
                sub={activePendingDocSubStatus}
                plain={isModal}
              />
            )}
            {needsPricing && (
              <>
                <ReviewPricingForm
                  key={`${booking.id}-pricing-sd-${booking.guest_requests_surprise_decor ? 1 : 0}-${propertyPricingLoaded ? 'loaded' : 'pending'}`}
                  booking={booking}
                  initialDraft={pricingValues}
                  onChange={setPricingValues}
                  readOnly={contentReadOnly}
                  propertyDefaults={propertyPricingDefaults}
                  dateOverrides={propertyPricingData?.dateOverrides}
                  holidayRules={propertyPricingData?.holidayRules}
                  variant={formVariant}
                />
                {booking.guest_requests_surprise_decor ? (
                  <SurpriseDecorAckCard
                    acknowledged={surpriseDecorStaffAck}
                    onAcknowledgedChange={setSurpriseDecorStaffAck}
                    readOnly={contentReadOnly}
                    plain={isModal}
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
                variant={formVariant}
              />
            )}
            {needsGuestBalance && (
              <GuestBalanceSettlementForm
                booking={booking}
                initialDraft={guestBalanceValues}
                onChange={setGuestBalanceValues}
                readOnly={contentReadOnly}
                variant={formVariant}
              />
            )}
            {needsSdRefund && (
              <SdRefundForm
                booking={booking}
                initialDraft={sdRefundValues}
                onChange={setSdRefundValues}
                readOnly={contentReadOnly}
                variant={formVariant}
              />
            )}
          </div>
        )}

        {!isModal && showStayGuide && (
          <div className="border-separator border-b px-4 py-4">
            <p className="text-overline text-muted-foreground mb-2 font-semibold">Stay guide</p>
            {stayGuideUrl ? (
              <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1">
                <a
                  href={stayGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={workflowInlineLink}
                >
                  Open stay guide
                </a>
                <InlineCopyIconButton
                  aria-label="Copy stay guide link to clipboard"
                  onClick={() => void copyStayGuideUrl()}
                />
              </span>
            ) : transitionMut.isPending || issueStayGuideMut.isPending ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Preparing stay guide link"
              />
            ) : null}
          </div>
        )}

        {/* ── Automation triggers (detail rail only) ─────────────────────── */}
        {!isModal && (showGmailPoll || showSdCron || showSdFormResend) && (
          <div className="border-separator border-b">
            <button
              type="button"
              aria-expanded={automationHelpOpen}
              onClick={() => setAutomationHelpOpen((o) => !o)}
              className="hover:bg-muted/50 flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left transition-colors"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Timer className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                <span className="text-overline text-muted-foreground font-semibold">
                  Automation Triggers
                </span>
              </span>
              {automationHelpOpen ? (
                <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              )}
            </button>

            {automationHelpOpen && (
              <div className="text-muted-foreground space-y-2 px-4 pb-3 text-[11.5px] leading-relaxed">
                {showSdCron ? (
                  <>
                    <p className="text-muted-foreground">
                      Two hours before checkout, guests get the check-out/SD email—even if balance
                      is unsettled. Settlement is still required to advance status.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="text-muted-foreground font-medium">Run SD refund cron</span>{' '}
                      checks{' '}
                      <span className="text-muted-foreground font-medium">this booking only</span>.
                      The same job also runs for other ready-for-check-in stays.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="text-muted-foreground font-medium">
                        Send SD refund form email
                      </span>{' '}
                      resends the link only. It does{' '}
                      <span className="text-muted-foreground font-medium">not</span> change booking
                      status.
                    </p>
                  </>
                ) : showGmailPoll ? (
                  <>
                    <p className="text-muted-foreground">
                      Use when inbox approvals look stuck. Shown while this booking awaits pipeline
                      documents.
                    </p>
                    <ol className="marker:text-muted-foreground list-decimal space-y-1.5 pl-4">
                      <li>
                        <span className="text-muted-foreground font-medium">
                          Run Gmail poll now
                        </span>{' '}
                        checks the inbox for all bookings awaiting that reply—not just this one.
                        Safe to rerun.
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      <span className="text-muted-foreground font-medium">
                        Send SD refund form email
                      </span>{' '}
                      resends the check-out/SD link. It does not advance the booking—email only.
                    </p>
                  </>
                )}

                <div className="border-separator flex flex-col gap-1.5 border-t pt-3">
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
          <div
            className={cn(
              isModal && 'mt-auto',
              isModal ? 'border-border shrink-0 border-t pt-5' : 'px-4 py-4'
            )}
          >
            {!isLiveView && !isModal ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={transitionMut.isPending}
                  onClick={returnToLiveStep}
                  className={workflowPrimaryActionClass(!transitionMut.isPending)}
                >
                  <span className="min-w-0 pr-2 text-left">Return to {statusLabel(status)}</span>
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                </button>
              </div>
            ) : (
              <div className={cn('flex flex-col', isModal ? 'gap-2' : 'gap-3 sm:gap-4')}>
                {!isModal ? <p className="text-overline">Actions</p> : null}
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
                        <span className="min-w-0 pr-2 text-left">Back to {statusLabel(prev)}</span>
                        {transitionMut.isPending ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" />
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
                            handleMarkPendingDocSubStatusIncomplete(activePendingDocSubStatus)
                          }
                          className={workflowWarningActionClass()}
                        >
                          <span className="min-w-0 pr-2 text-left">
                            Mark as Incomplete - {statusLabel(activePendingDocSubStatus)}
                          </span>
                          {transitionMut.isPending ? (
                            <Loader2 className="size-4 shrink-0 animate-spin text-amber-700" />
                          ) : (
                            <RotateCcw className="size-4 shrink-0 text-amber-700" aria-hidden />
                          )}
                        </button>
                      ) : !selectedPendingDocRequired ? (
                        <p className="border-border/50 bg-muted/50 text-muted-foreground flex min-h-[44px] items-center rounded-xl border px-3.5 py-2.5 text-sm">
                          {statusLabel(activePendingDocSubStatus)} is not required for this booking.
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={!selectedPendingDocCanMarkComplete || transitionMut.isPending}
                          onClick={() =>
                            handleMarkPendingDocSubStatusComplete(activePendingDocSubStatus)
                          }
                          className={workflowPrimaryActionClass(
                            selectedPendingDocCanMarkComplete && !transitionMut.isPending
                          )}
                        >
                          <span className="min-w-0 pr-2 text-left">
                            Mark as Complete - {statusLabel(activePendingDocSubStatus)}
                          </span>
                          {transitionMut.isPending ? (
                            <Loader2 className="size-4 shrink-0 animate-spin" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )}
                        </button>
                      )}
                    </div>
                    {showProceedToReadyForCheckin && (
                      <button
                        disabled={!pendingDocumentsComplete || transitionMut.isPending}
                        onClick={() =>
                          openForwardProceedConfirm(
                            'READY_FOR_CHECKIN',
                            'Proceed to Ready for Check-in'
                          )
                        }
                        className={workflowPrimaryActionClass(
                          pendingDocumentsComplete && !transitionMut.isPending
                        )}
                      >
                        <span className="min-w-0 pr-2 text-left">
                          Proceed to Ready for Check-in
                        </span>
                        {transitionMut.isPending ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    )}
                  </>
                )}

                {showLateParkingActions && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!selectedPendingDocCanMarkComplete || transitionMut.isPending}
                      onClick={() =>
                        handleMarkPendingDocSubStatusComplete('PENDING_PARKING_REQUEST')
                      }
                      className={workflowPrimaryActionClass(
                        selectedPendingDocCanMarkComplete && !transitionMut.isPending
                      )}
                    >
                      <span className="min-w-0 pr-2 text-left">
                        Mark as Complete - {statusLabel('PENDING_PARKING_REQUEST')}
                      </span>
                      {transitionMut.isPending ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
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
                    <span className="min-w-0 pr-2 text-left">Back to {statusLabel(prev)}</span>
                    {transitionMut.isPending ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <ArrowLeft className="size-4 shrink-0" aria-hidden />
                    )}
                  </button>
                )}

                {/* Forward — primary CTA. */}
                {livePipelineActions && next && (
                  <button
                    disabled={isTransitionDisabled(next) || transitionMut.isPending}
                    onClick={() =>
                      openForwardProceedConfirm(next, `Proceed to ${statusLabel(next)}`)
                    }
                    className={workflowPrimaryActionClass(
                      !isTransitionDisabled(next) && !transitionMut.isPending
                    )}
                  >
                    <span className="min-w-0 pr-2 text-left">Proceed to {statusLabel(next)}</span>
                    {transitionMut.isPending ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
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
                  <span className="min-w-0 pr-2 text-left">Cancel Booking</span>
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
          <ConfirmModal
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
    </>
  );
}

// ─── Pipeline stepper ─────────────────────────────────────────────────────────
//
// Vertical stepper for the booking's applicable pipeline. Completed and current
// steps are clickable to preview saved data (read-only when not the live step).
// Future steps stay disabled. Proceed / Back actions remain in the ACTIONS section.

function isPipelineStepSelected(step: BookingStatus, viewedStep: ViewedWorkflowStep): boolean {
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
    pendingDocsIdx >= 0 && currentIdx >= pendingDocsIdx && currentStatus !== 'CANCELLED';

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
            ? 'text-primary font-semibold'
            : isCurrent
              ? 'text-primary font-semibold'
              : isCompleted
                ? 'text-foreground font-medium'
                : 'text-muted-foreground font-medium'
        );

        return (
          <li key={step} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-colors',
                    isCurrent
                      ? 'bg-primary/10 ring-primary size-6 ring-2'
                      : isCompleted
                        ? 'gradient-primary text-primary-foreground size-5'
                        : 'bg-card ring-border/60 size-5 ring-1'
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="gradient-primary size-2 rounded-full" />
                  ) : null}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mb-0.5 mt-0.5 min-h-[14px] w-px flex-1',
                    isCompleted ? 'bg-primary/30' : 'bg-muted'
                  )}
                />
              )}
            </div>

            <div className={cn('flex flex-1 flex-col gap-3', isLast ? 'pb-0' : 'pb-3')}>
              <div className="flex min-h-6 items-center">
                {isReachable ? (
                  <button
                    type="button"
                    disabled={!!transitionPending}
                    onClick={() => {
                      if (!transitionPending) onSelectPipelineStep(step);
                    }}
                    className={cn(
                      '-my-[10px] inline-flex min-h-[44px] w-full items-center py-2 text-left leading-tight transition-colors',
                      transitionPending ? 'text-muted-foreground cursor-not-allowed' : labelClass,
                      !transitionPending && !isSelected && isCompleted ? 'hover:text-primary' : null
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
                <div className="text-caption mt-0.5">Since {formatRelative(statusUpdatedAt)}</div>
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
  const activeStatus = viewedStep.kind === 'pending-doc-sub' ? viewedStep.sub : undefined;
  const isLivePendingDocs = currentStatus === 'PENDING_DOCUMENTS';
  const canBrowseCompletedPendingDocs = pendingDocsIdx >= 0 && currentIdx > pendingDocsIdx;

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
    <ul className={cn('relative flex flex-col gap-3', className)}>
      {statuses.length > 1 ? (
        <div
          aria-hidden
          className="bg-muted pointer-events-none absolute bottom-[10px] left-2 top-[10px] w-px"
        />
      ) : null}
      {statuses.map((sub) => {
        const completed = isSubStatusCompletedInStepper(booking, sub);
        const isActive = activeStatus === sub;
        const subInteractive = isSubStepInteractive(sub);

        const iconClass = cn(
          'relative z-[1] box-border flex size-4 shrink-0 items-center justify-center rounded-full',
          completed ? 'gradient-primary text-primary-foreground' : 'border-border/60 bg-card border'
        );

        const labelClass = cn(
          'text-xs leading-4 transition-colors',
          transitionPending
            ? 'text-muted-foreground cursor-not-allowed'
            : isActive
              ? 'text-primary font-semibold'
              : completed
                ? 'text-foreground font-medium'
                : 'text-muted-foreground font-medium',
          subInteractive && !transitionPending && !isActive && 'hover:text-primary'
        );

        return (
          <li key={sub} className="flex items-center gap-2.5">
            <div className={iconClass}>
              {completed ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </div>

            {subInteractive ? (
              <div className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!transitionPending) onSelect?.(sub);
                  }}
                  disabled={!!transitionPending}
                  className={cn(
                    '-my-[10px] inline-flex min-h-[44px] min-w-0 flex-1 items-center py-2 text-left',
                    labelClass
                  )}
                  aria-label={`View ${statusLabel(sub)}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {statusLabel(sub)}
                </button>
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold leading-4',
                    completed ? 'text-primary' : 'text-amber-600'
                  )}
                >
                  {completed ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'flex min-h-6 flex-1 items-center text-xs leading-4',
                  completed ? 'font-medium text-emerald-700' : 'text-muted-foreground'
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
  plain = false,
}: {
  booking: BookingRow;
  sub: PendingDocumentSubStatus;
  plain?: boolean;
}) {
  const completed = isSubStatusCompleted(sub, booking);
  const isGaf = sub === 'PENDING_GAF';
  const isPet = sub === 'PENDING_PET_REQUEST';

  return (
    <WorkflowSubFormCard title={statusLabel(sub)} plain={plain}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Status</span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              completed
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            {completed ? 'Complete' : 'Incomplete'}
          </span>
        </div>

        {isGaf ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {!completed
                ? 'Waiting for Azure’s approved GAF. Use Run Gmail poll if an email was missed.'
                : booking.approved_gaf_pdf_url?.trim()
                  ? 'Azure returned an approved GAF. Sub-step marked complete.'
                  : 'Marked complete without an approved GAF file. Upload manually on the booking.'}
            </p>
            <DocLinkRow label="GAF request PDF" url={booking.gaf_request_pdf_url} />
            <DocLinkRow label="Approved GAF" url={booking.approved_gaf_pdf_url} />
            <DocLinkRow label="Guest valid ID" url={booking.valid_id_url} />
          </div>
        ) : null}

        {isPet ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {!completed
                ? 'Waiting for Azure’s approved pet request. Use Run Gmail poll if missed.'
                : booking.approved_pet_pdf_url?.trim()
                  ? 'Azure returned an approved pet request. Sub-step marked complete.'
                  : 'Marked complete without an approved pet file. Upload manually on the booking.'}
            </p>
            <DocLinkRow label="Pet request PDF" url={booking.pet_request_pdf_url} />
            <DocLinkRow label="Approved pet request" url={booking.approved_pet_pdf_url} />
            <DocLinkRow label="Pet vaccination" url={booking.pet_vaccination_url} />
            <DocLinkRow label="Pet photo" url={booking.pet_image_url} />
          </div>
        ) : null}
      </div>
    </WorkflowSubFormCard>
  );
}

function DocLinkRow({ label, url }: { label: string; url?: string | null }) {
  const trimmed = url?.trim();
  const normalized = trimmed ? (normalizeStoragePublicUrl(trimmed) ?? trimmed) : null;
  const parsed = normalized ? parseStorageUrl(normalized) : null;
  const needsSignedUrl = Boolean(parsed && PRIVATE_STORAGE_BUCKETS.has(parsed.bucket));

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() =>
    trimmed && !needsSignedUrl ? normalized : null
  );
  const [loading, setLoading] = useState(false);
  const [missingInStorage, setMissingInStorage] = useState(false);

  useEffect(() => {
    if (!trimmed) {
      setResolvedUrl(null);
      setLoading(false);
      setMissingInStorage(false);
      return;
    }
    if (!needsSignedUrl) {
      setResolvedUrl(normalized);
      setLoading(false);
      setMissingInStorage(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMissingInStorage(false);
    setResolvedUrl(null);
    resolveAssetUrlForBrowser(trimmed)
      .then((signed) => {
        if (!cancelled) setResolvedUrl(signed);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isStorageObjectNotFoundError(err)) {
          setMissingInStorage(true);
          return;
        }
        setResolvedUrl(normalized);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, normalized, needsSignedUrl]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {!trimmed ? (
        <span className="text-muted-foreground italic">Not available</span>
      ) : loading ? (
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Loading…
        </span>
      ) : missingInStorage ? (
        <span className="text-muted-foreground italic">File missing from storage</span>
      ) : (
        <a
          href={resolvedUrl ?? normalized ?? trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(workflowInlineLink, 'inline-flex items-center gap-1')}
        >
          View
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </a>
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

  const showDevControls = devControls.length > 0 && devControlValues && onDevControlToggle;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-4">
      <div className="border-border bg-card flex max-h-[min(90dvh,calc(100dvh-1.5rem))] w-full max-w-[min(calc(100vw-1.5rem),28rem)] flex-col overflow-hidden rounded-xl border p-5 shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-foreground text-lg font-semibold sm:text-xl">{title}</h3>
              {banner ? <div className="mt-3">{banner}</div> : null}
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
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
        <div className="border-separator mt-5 flex shrink-0 justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-muted-foreground hover:bg-muted min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
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
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20 shadow-sm'
                : 'gradient-primary text-primary-foreground shadow-soft hover:shadow-primary-glow hover:brightness-[1.03]'
            )}
          >
            {isLoading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
