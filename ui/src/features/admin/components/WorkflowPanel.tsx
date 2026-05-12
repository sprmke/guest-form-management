/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Shows:
 * - Progress card: **StatusBadge** in the header row + pipeline stepper (per-step timing)
 * - Stage-specific sub-form (ReviewPricingForm + SurpriseDecorAckCard when applicable,
 *   ParkingRequestForm / SdRefundForm),
 *   plus **READY_FOR_CHECKOUT** guest `/sd-form` link + copy + **Recheck** (refetch booking)
 * - Dev-control checkboxes (collapsible, default collapsed; only relevant controls
 *   are shown based on the current booking status)
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
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Settings2,
  Timer,
  Square,
  X,
} from 'lucide-react';
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
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import {
  applicableTransitions,
  arePendingDocumentsComplete,
  bookingPipeline,
  isSubStatusCompleted,
  isSubStatusCompletedInStepper,
  isSubStatusRequired,
  nextStep,
  type PendingDocumentSubStatus,
  previousStep,
  requiredSubForm,
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

// ─── Dev-control config (status-aware) ───────────────────────────────────────

type DevControlDef = {
  key: keyof DevControlFlags;
  label: string;
  description: string;
  /** Returns true when this checkbox is relevant for the current booking state. */
  isRelevant: (
    status: BookingStatus,
    transitions: BookingStatus[],
    booking: BookingRow,
  ) => boolean;
};

const DEV_CONTROLS: DevControlDef[] = [
  {
    key: 'saveToDatabase',
    label: 'Save to Database',
    description: 'Persist status and workflow fields',
    isRelevant: () => true,
  },
  {
    key: 'updateGoogleCalendar',
    label: 'Update Google Calendar',
    description: 'Update event color and title',
    isRelevant: () => true,
  },
  {
    key: 'updateGoogleSheets',
    label: 'Update Google Sheets',
    description: 'Update status and workflow columns',
    isRelevant: () => true,
  },
  {
    key: 'generatePdf',
    label: 'Generate GAF / pet request PDFs',
    description:
      'Build filled PDFs for Azure (GAF + pet if applicable), attach to request emails, and save URLs when DB save is on',
    isRelevant: (status) => status === 'PENDING_REVIEW',
  },
  {
    key: 'sendGafRequestEmail',
    label: 'Send GAF Request Email',
    description: 'Email Azure North with GAF request',
    // Only fired during PENDING_REVIEW → PENDING_DOCUMENTS
    isRelevant: (status) => status === 'PENDING_REVIEW',
  },
  {
    key: 'sendBookingAcknowledgementEmail',
    label: 'Send Acknowledgement Email',
    description: 'Email guest with booking confirmation',
    // Only fired during PENDING_REVIEW → PENDING_DOCUMENTS
    isRelevant: (status) => status === 'PENDING_REVIEW',
  },
  {
    key: 'sendParkingBroadcastEmail',
    label: 'Send Parking Broadcast',
    description: 'BCC parking owners about this booking',
    // Only relevant when transitioning from PENDING_REVIEW and booking has parking
    isRelevant: (status, _, b) =>
      status === 'PENDING_REVIEW' && !!b.need_parking,
  },
  {
    key: 'sendPetRequestEmail',
    label: 'Send Pet Request Email',
    description: 'Email Azure North with pet request',
    // Only relevant when transitioning from PENDING_REVIEW and booking has pets
    isRelevant: (status, _, b) => status === 'PENDING_REVIEW' && !!b.has_pets,
  },
  {
    key: 'sendReadyForCheckinEmail',
    label: 'Send Ready-for-Check-in Email',
    description: 'Notify guest they are cleared for check-in',
    // Only relevant on FORWARD transitions to READY_FOR_CHECKIN. The server
    // gates this too — backward transitions (e.g. PENDING_SD_REFUND →
    // READY_FOR_CHECKIN) never fire the ready email regardless of this flag.
    isRelevant: (status) =>
      status === 'PENDING_DOCUMENTS' ||
      status === 'PENDING_GAF' ||
      status === 'PENDING_PARKING_REQUEST' ||
      status === 'PENDING_PET_REQUEST',
  },
  {
    key: 'sendSdRefundFormEmail',
    label: 'Send SD Refund Form Email',
    description:
      'Email guest the /sd-form link (security deposit refund) when moving to check-out',
    // READY_FOR_CHECKIN → READY_FOR_CHECKOUT (cron uses the same flag).
    isRelevant: (status) => status === 'READY_FOR_CHECKIN',
  },
];

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

  // Dev controls — collapsed by default. All toggles start CHECKED so the
  // booking takes the full happy path (DB write + Calendar + Sheet + the
  // emails that apply to this transition); admins uncheck just the side
  // effects they want to skip. The server's `flag()` helper also treats
  // undefined as `true`, so this UI default mirrors the server default.
  const [devOpen, setDevOpen] = useState(false);
  const [automationHelpOpen, setAutomationHelpOpen] = useState(false);
  const [devControls, setDevControls] = useState<DevControlFlags>(() =>
    DEV_CONTROLS.reduce<DevControlFlags>(
      (acc, c) => ({ ...acc, [c.key]: true }),
      {},
    ),
  );
  const toggleControl = (key: keyof DevControlFlags) => {
    setDevControls((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
  const [activePendingDocSubStatus, setActivePendingDocSubStatus] =
    useState<PendingDocumentSubStatus>('PENDING_GAF');

  useEffect(() => {
    setActivePendingDocSubStatus((current) =>
      isSubStatusRequired(current, booking) ? current : 'PENDING_GAF',
    );
  }, [booking.id, booking.need_parking, booking.has_pets]);

  // Confirm modals
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const transitionMut = useTransitionBooking();
  const cancelMut = useCancelBooking();
  const gmailPollMut = useRunGmailPoll(booking.id);
  const gmailPollMutRef = useRef(gmailPollMut);
  gmailPollMutRef.current = gmailPollMut;
  /** Dedupes React Strict Mode double-invoke; cleared when leaving PENDING_DOCUMENTS. */
  const pendingDocsAutoGmailPollRef = useRef<string | null>(null);
  const sdCronMut = useRunSdRefundCron(booking.id);
  const resendSdFormMut = useResendSdRefundFormEmail(booking.id);

  // Which automation triggers are relevant for this status (Q6.6)
  const showGmailPoll =
    status === 'PENDING_DOCUMENTS' ||
    status === 'PENDING_GAF' ||
    status === 'PENDING_PET_REQUEST';
  const showSdCron = status === 'READY_FOR_CHECKIN';
  const showSdFormResend =
    status === 'READY_FOR_CHECKOUT' || status === 'READY_FOR_CHECKIN';
  const showReadyForCheckoutSdGuestInfo = status === 'READY_FOR_CHECKOUT';
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
  }, [booking.id, status]);

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

  // Booking-data-aware transitions for the dev-controls relevance check.
  // The "ACTIONS" UI itself is now driven by `next` + `prev` below — at most
  // one forward and one backward step are shown at a time, mirroring the
  // pipeline computed by `bookingPipeline()`.
  const transitions = applicableTransitions(status, { manual: true }, booking);

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

  // Relevant dev controls for this booking + status
  const relevantControls = DEV_CONTROLS.filter((c) =>
    c.isRelevant(status, transitions, booking),
  );
  const checkedCount = relevantControls.filter(
    (c) => !!devControls[c.key],
  ).length;

  // ─── Sub-form helpers ────────────────────────────────────────────────────

  function buildPayload(toStatus: BookingStatus): TransitionPayload {
    const subForm = requiredSubForm(status, toStatus);
    if (subForm === 'pricing' && pricingValues) {
      const base = {
        booking_rate: pricingValues.booking_rate,
        down_payment: pricingValues.down_payment,
        security_deposit: pricingValues.security_deposit,
        pet_fee: pricingValues.pet_fee,
        parking_rate_guest: pricingValues.parking_rate_guest,
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
    setConfirm(null);
    try {
      await transitionMut.mutateAsync({
        bookingId: booking.id,
        toStatus,
        payload: buildPayload(toStatus),
        devControls,
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
        toStatus: 'PENDING_DOCUMENTS',
        payload,
        devControls,
        manual: true,
      });
      toast.success(`Marked ${statusLabel(subStatus)} as complete`);
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
        toStatus: 'PENDING_DOCUMENTS',
        payload: { document_completion_clear_target: subStatus },
        devControls,
        manual: true,
      });
      toast.success(`Marked ${statusLabel(subStatus)} as incomplete`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to mark sub-status incomplete');
    }
  }

  async function handleCancel() {
    setCancelConfirm(false);
    try {
      await cancelMut.mutateAsync({ bookingId: booking.id, devControls });
      toast.success('Booking cancelled');
    } catch (err: any) {
      toast.error(err?.message ?? 'Cancel failed');
    }
  }

  // ─── Sub-form visibility ─────────────────────────────────────────────────

  const needsPricing =
    !inPendingDocuments &&
    transitions.some((t) => requiredSubForm(status, t) === 'pricing');
  const needsParking =
    (inPendingDocuments &&
      activePendingDocSubStatus === 'PENDING_PARKING_REQUEST' &&
      isSubStatusRequired('PENDING_PARKING_REQUEST', booking) &&
      !isSubStatusCompleted('PENDING_PARKING_REQUEST', booking)) ||
    transitions.some((t) => requiredSubForm(status, t) === 'parking');
  const needsSdRefund = transitions.some(
    (t) => requiredSubForm(status, t) === 'sd_refund',
  );
  const needsGuestBalance = transitions.some(
    (t) => requiredSubForm(status, t) === 'guest_balance',
  );

  return (
    <aside className="flex overflow-hidden flex-col gap-0 bg-white rounded-xl border shadow-sm border-slate-200">
      {/* ── Pipeline stepper ──────────────────────────────────────────────── */}
      {pipeline.length > 0 && status !== 'CANCELLED' ? (
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
              Progress
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <PipelineStepper
            pipeline={pipeline}
            currentStatus={status}
            statusUpdatedAt={booking.status_updated_at}
            booking={booking}
            activePendingDocSubStatus={activePendingDocSubStatus}
            onSelectPendingDocSubStatus={setActivePendingDocSubStatus}
            transitionPending={transitionMut.isPending}
          />
        </div>
      ) : status === 'CANCELLED' ? (
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
              Status
            </p>
            <StatusBadge status={booking.status} />
          </div>
        </div>
      ) : null}

      {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
      {(needsPricing ||
        needsParking ||
        needsSdRefund ||
        needsGuestBalance ||
        showReadyForCheckoutSdGuestInfo) && (
        <div className="px-4 py-4 border-b border-slate-100 space-y-6">
          {showReadyForCheckoutSdGuestInfo && (
            <WorkflowSubFormCard title="Guest SD refund form">
              <p className="text-[11.5px] leading-relaxed text-slate-600">
                We are just waiting for the guest to fill out the SD Refund
                form. Once they submit it, this booking will automatically move
                to{' '}
                <span className="font-medium text-slate-800">
                  Pending SD Refund
                </span>{' '}
                status.
              </p>
              <div>
                <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1">
                  <a
                    href={sdGuestFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:text-blue-800 sm:text-[13px] sm:font-normal"
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
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px]"
              >
                {recheckSdGuestSubmitPending ? (
                  <Loader2
                    className="size-3.5 shrink-0 animate-spin text-slate-500"
                    aria-hidden
                  />
                ) : (
                  <RefreshCw
                    className="size-3.5 shrink-0 text-slate-500"
                    aria-hidden
                  />
                )}
                Check for guest submission
              </button>
            </WorkflowSubFormCard>
          )}
          {needsPricing && (
            <>
              <ReviewPricingForm
                key={`${booking.id}-pricing-sd-${booking.guest_requests_surprise_decor ? 1 : 0}`}
                booking={booking}
                initialDraft={pricingValues}
                onChange={setPricingValues}
              />
              {booking.guest_requests_surprise_decor ? (
                <SurpriseDecorAckCard
                  acknowledged={surpriseDecorStaffAck}
                  onAcknowledgedChange={setSurpriseDecorStaffAck}
                />
              ) : null}
            </>
          )}
          {needsParking && (
            <ParkingRequestForm
              booking={booking}
              initialDraft={parkingValues}
              onChange={setParkingValues}
            />
          )}
          {needsGuestBalance && (
            <GuestBalanceSettlementForm
              booking={booking}
              initialDraft={guestBalanceValues}
              onChange={setGuestBalanceValues}
            />
          )}
          {needsSdRefund && (
            <SdRefundForm
              booking={booking}
              initialDraft={sdRefundValues}
              onChange={setSdRefundValues}
            />
          )}
        </div>
      )}

      {/* ── Dev controls (collapsible) ────────────────────────────────────── */}
      {!isTerminal && relevantControls.length > 0 && (
        <div className="border-b border-slate-100">
          <button
            type="button"
            onClick={() => setDevOpen((o) => !o)}
            className="flex justify-between items-center px-4 py-3 w-full text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex gap-2 items-center">
              <Settings2 className="size-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Dev Controls
              </span>
              {checkedCount > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {checkedCount}
                </span>
              )}
            </span>
            {devOpen ? (
              <ChevronDown className="size-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="size-3.5 text-slate-400" />
            )}
          </button>

          {devOpen && (
            <div className="space-y-0.5 px-4 pb-3">
              {relevantControls.map(({ key, label, description }) => {
                const checked = !!devControls[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleControl(key)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="mt-0.5 shrink-0">
                      {checked ? (
                        <CheckSquare className="size-3.5 text-blue-600" />
                      ) : (
                        <Square className="size-3.5 text-slate-300" />
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span
                        className={cn(
                          'text-xs font-medium leading-snug',
                          checked ? 'text-slate-800' : 'text-slate-600',
                        )}
                      >
                        {label}
                      </span>
                      <span className="text-[10.5px] leading-tight text-slate-400">
                        {description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Automation triggers (Q6.6) ───────────────────────────────────── */}
      {(showGmailPoll || showSdCron || showSdFormResend) && (
        <div className="border-b border-slate-100">
          <button
            type="button"
            aria-expanded={automationHelpOpen}
            onClick={() => setAutomationHelpOpen((o) => !o)}
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Timer className="size-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Automation Triggers
              </span>
            </span>
            {automationHelpOpen ? (
              <ChevronDown
                className="size-3.5 shrink-0 text-slate-400"
                aria-hidden
              />
            ) : (
              <ChevronRight
                className="size-3.5 shrink-0 text-slate-400"
                aria-hidden
              />
            )}
          </button>

          {automationHelpOpen && (
            <div className="space-y-2 px-4 pb-3 text-[11.5px] leading-relaxed text-slate-500">
              {showSdCron ? (
                <>
                  <p className="text-slate-500">
                    Two hours before the check-out time, we will send an email
                    to the guest regarding the{' '}
                    <span className="font-medium text-slate-600">
                      Check-out and Security-deposit refund details
                    </span>
                    . That email will still send even we haven&apos;t settle the
                    guest balance but is required to move the booking to{' '}
                    <span className="font-medium text-slate-600">
                      Ready for check-out
                    </span>{' '}
                    status .
                  </p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-600">
                      Run SD refund cron
                    </span>{' '}
                    runs the checks for{' '}
                    <span className="font-medium text-slate-600">
                      this booking only
                    </span>
                    . The same checks also run automatically in the background
                    for{' '}
                    <span className="font-medium text-slate-600">
                      other bookings
                    </span>{' '}
                    that's still at 'Ready for Check-in' status.
                  </p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-600">
                      Send SD refund form email
                    </span>{' '}
                    only sends the email again in case the guest didn't receive
                    it. This does{' '}
                    <span className="font-medium text-slate-600">not</span>{' '}
                    change booking status automatically.
                  </p>
                </>
              ) : showGmailPoll ? (
                <>
                  <p className="text-slate-500">
                    Use this if approval emails from the inbox look stuck. Shown
                    while this booking is waiting on documents from the
                    pipeline.
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-4 marker:text-slate-400">
                    <li>
                      <span className="font-medium text-slate-600">
                        Run Gmail poll now
                      </span>{' '}
                      — checks the inbox for{' '}
                      <strong className="font-semibold text-slate-600">
                        every
                      </strong>{' '}
                      booking that might be waiting on that kind of reply, not
                      just this one. Safe to run more than once.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-600">
                      Send SD refund form email
                    </span>{' '}
                    mails the check-out and security-deposit link to the guest
                    again—for example they missed it or you need a manual
                    resend. It does not move the booking to the next step; it
                    only sends the message.
                  </p>
                </>
              )}

              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                {showGmailPoll && (
                  <button
                    type="button"
                    disabled={gmailPollMut.isPending}
                    onClick={handleGmailPoll}
                    className="flex gap-2 items-center min-h-[44px] px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {gmailPollMut.isPending ? (
                      <Loader2 className="size-3.5 animate-spin shrink-0" />
                    ) : (
                      <Mail className="size-3.5 shrink-0" />
                    )}
                    Run Gmail poll now
                  </button>
                )}
                {showSdCron && (
                  <button
                    type="button"
                    disabled={sdCronMut.isPending}
                    onClick={handleSdCron}
                    className="flex gap-2 items-center min-h-[44px] px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {sdCronMut.isPending ? (
                      <Loader2 className="size-3.5 animate-spin shrink-0" />
                    ) : (
                      <RefreshCw className="size-3.5 shrink-0" />
                    )}
                    Run SD refund cron
                  </button>
                )}
                {showSdFormResend && (
                  <button
                    type="button"
                    disabled={resendSdFormMut.isPending}
                    onClick={handleResendSdFormEmail}
                    className="flex gap-2 items-center min-h-[44px] px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {resendSdFormMut.isPending ? (
                      <Loader2 className="size-3.5 animate-spin shrink-0" />
                    ) : (
                      <Mail className="size-3.5 shrink-0" />
                    )}
                    Send SD refund form email
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
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Actions
          </p>
          <div className="flex flex-col gap-4">
            {inPendingDocuments && (
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
                    className="flex items-center justify-between rounded-lg bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:ring-slate-300 transition-all disabled:opacity-50"
                  >
                    <span className="flex gap-2 items-center">
                      <span>Back to {statusLabel(prev)}</span>
                      {transitionMut.isPending ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <ArrowLeft className="size-4 shrink-0" />
                      )}
                    </span>
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
                      className="flex min-h-[44px] items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200/80 bg-amber-50 hover:bg-amber-100/90 hover:ring-amber-300/80 transition-colors disabled:opacity-50"
                    >
                      <span>
                        Mark as Incomplete -{' '}
                        {statusLabel(activePendingDocSubStatus)}
                      </span>
                      {transitionMut.isPending ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-amber-700" />
                      ) : (
                        <RotateCcw
                          className="size-4 shrink-0 text-amber-700"
                          aria-hidden
                        />
                      )}
                    </button>
                  ) : !selectedPendingDocRequired ? (
                    <p className="flex min-h-[44px] items-center rounded-lg px-3.5 py-2.5 text-sm text-slate-500 bg-slate-50 ring-1 ring-slate-200">
                      {statusLabel(activePendingDocSubStatus)} is not required
                      for this booking.
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
                      className={cn(
                        'flex min-h-[44px] items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-1 transition-all',
                        selectedPendingDocCanMarkComplete &&
                          !transitionMut.isPending
                          ? 'bg-blue-600 text-white ring-blue-600 hover:bg-blue-700 hover:ring-blue-700 shadow-sm'
                          : 'cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200',
                      )}
                    >
                      <span>
                        Mark as Complete -{' '}
                        {statusLabel(activePendingDocSubStatus)}
                      </span>
                      {transitionMut.isPending ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0" />
                      )}
                    </button>
                  )}
                </div>
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
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-1 transition-all',
                    pendingDocumentsComplete && !transitionMut.isPending
                      ? 'bg-primary text-primary-foreground ring-primary hover:bg-primary/90 hover:ring-primary/90 shadow-sm'
                      : 'cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200',
                  )}
                >
                  <span>Proceed to Ready for Check-in</span>
                  {transitionMut.isPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0" />
                  )}
                </button>
              </>
            )}

            {/* Backward — secondary recovery action. */}
            {!inPendingDocuments && prev && (
              <button
                disabled={transitionMut.isPending}
                onClick={() =>
                  setConfirm({
                    toStatus: prev,
                    label: `Back to ${statusLabel(prev)}`,
                  })
                }
                className="flex items-center justify-between rounded-lg bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:ring-slate-300 transition-all disabled:opacity-50"
              >
                <span className="flex gap-2 items-center">
                  {transitionMut.isPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <ArrowLeft className="size-4 shrink-0" />
                  )}
                  <span>Back to {statusLabel(prev)}</span>
                </span>
              </button>
            )}

            {/* Forward — primary CTA. */}
            {!inPendingDocuments && next && (
              <button
                disabled={isTransitionDisabled(next) || transitionMut.isPending}
                onClick={() =>
                  openForwardProceedConfirm(
                    next,
                    `Proceed to ${statusLabel(next)}`,
                  )
                }
                className={cn(
                  'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-1 transition-all',
                  isTransitionDisabled(next) || transitionMut.isPending
                    ? 'cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200'
                    : 'bg-primary text-primary-foreground ring-primary hover:bg-primary/90 hover:ring-primary/90 shadow-sm',
                )}
              >
                <span>Proceed to {statusLabel(next)}</span>
                {transitionMut.isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronRight className="size-4 shrink-0" />
                )}
              </button>
            )}

            <button
              disabled={cancelMut.isPending}
              onClick={() => setCancelConfirm(true)}
              className="flex items-center justify-between rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 hover:ring-red-300 transition-all disabled:opacity-50"
            >
              <span>Cancel Booking</span>
              <X className="size-4 shrink-0" />
            </button>

            {!inPendingDocuments && !next && !prev && (
              <p className="text-[11px] text-slate-400">
                No further pipeline steps are available for this booking.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm transition modal ─────────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          title={confirm.label}
          secondaryLabel="Cancel"
          banner={
            confirm.pastStayWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                <p className="font-semibold">Stay dates are in the past</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/95">
                  At least one of check-in (
                  {formatBookingDate(booking.check_in_date)}) or check-out (
                  {formatBookingDate(booking.check_out_date)}) is before today’s
                  calendar date in Asia/Manila. Only continue if you still
                  intend to advance this booking.
                </p>
              </div>
            ) : null
          }
          description={`Transition from "${statusLabel(status)}" to "${statusLabel(confirm.toStatus)}". Checked dev-control side effects will fire.`}
          onConfirm={() => handleTransition(confirm.toStatus)}
          onCancel={() => setConfirm(null)}
          isLoading={transitionMut.isPending}
        />
      )}

      {cancelConfirm && (
        <ConfirmModal
          title="Cancel Booking"
          secondaryLabel="Keep booking"
          description="This will mark the booking as CANCELLED, update the Calendar (purple) and Sheet. All guest data is preserved. This cannot be undone."
          onConfirm={handleCancel}
          onCancel={() => setCancelConfirm(false)}
          isLoading={cancelMut.isPending}
          destructive
        />
      )}
    </aside>
  );
}

// ─── Pipeline stepper ─────────────────────────────────────────────────────────
//
// Vertical stepper that mirrors the booking's *applicable* pipeline (parking
// and pet stages are filtered out when those flags are off). Steps before the
// current status render as "completed" with a check; the current step renders
// with a filled ring + relative timestamp; later steps render as outlined
// dots. The stepper is purely informational — actual navigation happens via
// the Proceed / Back buttons in the ACTIONS section.

function PipelineStepper({
  pipeline,
  currentStatus,
  statusUpdatedAt,
  booking,
  activePendingDocSubStatus,
  onSelectPendingDocSubStatus,
  transitionPending,
}: {
  pipeline: BookingStatus[];
  currentStatus: BookingStatus;
  statusUpdatedAt?: string | null;
  booking: BookingRow;
  activePendingDocSubStatus: PendingDocumentSubStatus;
  onSelectPendingDocSubStatus: (status: PendingDocumentSubStatus) => void;
  transitionPending: boolean;
}) {
  const currentIdx = pipeline.indexOf(currentStatus);
  return (
    <ol className="flex flex-col">
      {pipeline.map((step, i) => {
        const isCompleted = currentIdx >= 0 && i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === pipeline.length - 1;
        return (
          <li key={step} className="flex gap-3">
            {/* Connector + dot column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex justify-center items-center rounded-full transition-colors shrink-0',
                  isCurrent
                    ? 'w-6 h-6 bg-blue-50 ring-2 ring-blue-500'
                    : isCompleted
                      ? 'w-5 h-5 text-white bg-emerald-500'
                      : 'w-5 h-5 bg-white ring-1 ring-slate-300',
                )}
              >
                {isCompleted ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : isCurrent ? (
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                ) : null}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-0.5 mb-0.5 w-px flex-1 min-h-[14px]',
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200',
                  )}
                />
              )}
            </div>

            {/* Label column */}
            <div className={cn('flex-1 -mt-0.5', isLast ? 'pb-0' : 'pb-3')}>
              <div
                className={cn(
                  'text-[12.5px] leading-tight transition-colors',
                  isCurrent
                    ? 'font-semibold text-blue-700'
                    : isCompleted
                      ? 'font-medium text-slate-700'
                      : 'font-medium text-slate-400',
                )}
              >
                {statusLabel(step)}
              </div>
              {step === 'PENDING_DOCUMENTS' && (
                <PendingDocumentsSubTree
                  booking={booking}
                  className="mt-4"
                  activeStatus={activePendingDocSubStatus}
                  onSelect={onSelectPendingDocSubStatus}
                  transitionPending={transitionPending}
                  isInteractive={currentStatus === 'PENDING_DOCUMENTS'}
                />
              )}
              {isCurrent && statusUpdatedAt && (
                <div className="mt-0.5 text-[10.5px] text-slate-500">
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
  activeStatus,
  onSelect,
  transitionPending,
  isInteractive = false,
}: {
  booking: BookingRow;
  className?: string;
  activeStatus?: PendingDocumentSubStatus;
  onSelect?: (status: PendingDocumentSubStatus) => void;
  transitionPending?: boolean;
  isInteractive?: boolean;
}) {
  /** Canonical order: GAF → parking → pet (matches server / booking pipeline). */
  const allStatuses: PendingDocumentSubStatus[] = [
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
  ];

  const statuses = allStatuses.filter((s) => isSubStatusRequired(s, booking));

  return (
    <div className={cn('space-y-1.5 pl-2', className)}>
      {statuses.map((sub, index) => {
        const completed = isSubStatusCompletedInStepper(booking, sub);
        const isLast = index === statuses.length - 1;
        const isActive = activeStatus === sub;
        return (
          <div key={sub} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'mt-[2px] flex h-4 w-4 items-center justify-center rounded-full',
                  completed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white ring-1 ring-slate-300',
                )}
              >
                {completed ? (
                  <Check className="size-2.5" strokeWidth={3} />
                ) : null}
              </div>
              {!isLast && <div className="mt-0.5 h-4 w-px bg-slate-200" />}
            </div>
            {isInteractive ? (
              <div className="flex min-h-[35px] flex-1 items-start justify-between pt-[1px]">
                <button
                  type="button"
                  onClick={() => {
                    if (!transitionPending) onSelect?.(sub);
                  }}
                  disabled={!!transitionPending}
                  className={cn(
                    'text-left text-[11px] leading-4 transition-colors',
                    transitionPending
                      ? 'cursor-not-allowed text-slate-400'
                      : isActive
                        ? 'font-semibold text-blue-700'
                        : 'font-medium text-slate-500 hover:text-blue-700',
                  )}
                  aria-label={`Select ${statusLabel(sub)}`}
                >
                  {statusLabel(sub)}
                </button>
                <span
                  className={cn(
                    'pt-[1px] text-[10.5px] font-semibold',
                    completed ? 'text-emerald-700' : 'text-amber-600',
                  )}
                >
                  {completed ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'text-[11px] leading-4',
                  completed ? 'font-medium text-emerald-700' : 'text-slate-400',
                )}
              >
                {statusLabel(sub)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  banner,
  secondaryLabel = 'Back',
  onConfirm,
  onCancel,
  isLoading,
  destructive = false,
}: {
  title: string;
  description: string;
  banner?: ReactNode;
  /** Dismiss control (e.g. `Cancel` for transitions, `Keep booking` when cancelling a booking). */
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  destructive?: boolean;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center bg-black/40 backdrop-blur-[2px]">
      <div className="p-5 w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex gap-3 items-start">
          {destructive && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="text-red-600 size-4" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {banner ? <div className="mt-3">{banner}</div> : null}
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'min-h-[44px] px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50',
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700',
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
