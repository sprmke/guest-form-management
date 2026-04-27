/**
 * WorkflowPanel — Right-side rail on the booking detail page.
 *
 * Shows:
 * - Current status badge + status_updated_at
 * - Stage-specific sub-form (ReviewPricingForm / ParkingRequestForm / SdRefundForm)
 * - Dev-control checkboxes (collapsible, default collapsed; only relevant controls
 *   are shown based on the current booking status)
 * - Available transition buttons (from canTransition / canManualForceTransition)
 * - Cancel booking (always visible unless already CANCELLED)
 *
 * Plan: docs/NEW_FLOW_PLAN.md §3.1, admin-dashboard.mdc §WorkflowPanel
 * Auth: admin-auth.mdc §5 (Dev controls panel)
 */

import { useState } from 'react';
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
  Settings2,
  Square,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import {
  ReviewPricingForm,
  type ReviewPricingValues,
} from '@/features/admin/components/ReviewPricingForm';
import {
  ParkingRequestForm,
  type ParkingRequestValues,
} from '@/features/admin/components/ParkingRequestForm';
import {
  SdRefundForm,
  type SdRefundValues,
} from '@/features/admin/components/SdRefundForm';
import {
  applicableTransitions,
  bookingPipeline,
  nextStep,
  previousStep,
  requiredSubForm,
} from '@/features/admin/lib/workflow';
import {
  TERMINAL_STATUSES,
  statusLabel,
  type BookingStatus,
} from '@/features/admin/lib/bookingStatus';
import { formatRelative } from '@/features/admin/lib/formatters';
import {
  useTransitionBooking,
  useCancelBooking,
  useRunGmailPoll,
  useRunSdRefundCron,
  useResendSdRefundFormEmail,
  type DevControlFlags,
  type TransitionPayload,
} from '@/features/admin/hooks/useTransitionBooking';
import type { BookingRow } from '@/features/admin/lib/types';
import { cn } from '@/lib/utils';

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
    key: 'sendGafRequestEmail',
    label: 'Send GAF Request Email',
    description: 'Email Azure North with GAF request',
    // Only fired during PENDING_REVIEW → PENDING_GAF
    isRelevant: (status) => status === 'PENDING_REVIEW',
  },
  {
    key: 'sendBookingAcknowledgementEmail',
    label: 'Send Acknowledgement Email',
    description: 'Email guest with booking confirmation',
    // Only fired during PENDING_REVIEW → PENDING_GAF
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
      status === 'PENDING_GAF' ||
      status === 'PENDING_PARKING_REQUEST' ||
      status === 'PENDING_PET_REQUEST',
  },
  {
    key: 'sendSdRefundFormEmail',
    label: 'Send SD Refund Form Email',
    description: 'Email guest the link to submit refund details (/sd-form)',
    // READY_FOR_CHECKIN → PENDING_SD_REFUND_DETAILS (cron uses the same flag).
    isRelevant: (status) => status === 'READY_FOR_CHECKIN',
  },
];

// ─── Confirm dialog ───────────────────────────────────────────────────────────

type ConfirmState = {
  toStatus: BookingStatus;
  label: string;
} | null;

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  booking: BookingRow;
};

export function WorkflowPanel({ booking }: Props) {
  const status = booking.status as BookingStatus;
  const isTerminal = TERMINAL_STATUSES.has(status);

  // Dev controls — collapsed by default. All toggles start CHECKED so the
  // booking takes the full happy path (DB write + Calendar + Sheet + the
  // emails that apply to this transition); admins uncheck just the side
  // effects they want to skip. The server's `flag()` helper also treats
  // undefined as `true`, so this UI default mirrors the server default.
  const [devOpen, setDevOpen] = useState(false);
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
    useState<ReviewPricingValues | null>(null);
  const [parkingValues, setParkingValues] =
    useState<ParkingRequestValues | null>(null);
  const [sdRefundValues, setSdRefundValues] = useState<SdRefundValues | null>(
    null,
  );

  // Confirm modals
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const transitionMut = useTransitionBooking();
  const cancelMut = useCancelBooking();
  const gmailPollMut = useRunGmailPoll(booking.id);
  const sdCronMut = useRunSdRefundCron(booking.id);
  const resendSdFormMut = useResendSdRefundFormEmail(booking.id);

  // Which automation triggers are relevant for this status (Q6.6)
  const showGmailPoll =
    status === 'PENDING_GAF' || status === 'PENDING_PET_REQUEST';
  const showSdCron = status === 'READY_FOR_CHECKIN';
  const showSdFormResend = status === 'PENDING_SD_REFUND_DETAILS';

  async function handleGmailPoll() {
    try {
      const result = await gmailPollMut.mutateAsync();
      const applied = result.applied ?? 0;
      const msg = result.initialized
        ? 'Gmail cursor initialized (first run — no backlog processed)'
        : result.historyReset
          ? 'Gmail history expired and was reset — check for missed emails manually'
          : `Gmail poll complete: ${applied} applied, ${result.skipped ?? 0} skipped, ${result.failed ?? 0} failed`;
      toast.success(msg);
    } catch (err: any) {
      toast.error(err?.message ?? 'Gmail poll failed');
    }
  }

  async function handleSdCron() {
    try {
      const result = await sdCronMut.mutateAsync();
      const transitioned = result.transitioned ?? 0;
      toast.success(
        transitioned > 0
          ? `SD refund cron: ${transitioned} booking(s) transitioned → Pending SD Refund Details`
          : `SD refund cron: no bookings due yet (${result.scanned ?? 0} scanned)`,
      );
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
      return {
        booking_rate: pricingValues.booking_rate,
        down_payment: pricingValues.down_payment,
        security_deposit: pricingValues.security_deposit,
        pet_fee: pricingValues.pet_fee,
      };
    }
    if (subForm === 'parking' && parkingValues) {
      return {
        parking_rate_paid: parkingValues.parking_rate_paid,
        parking_owner_email: parkingValues.parking_owner_email || null,
        parking_endorsement_url: parkingValues.parking_endorsement_url || null,
      };
    }
    if (subForm === 'sd_refund' && sdRefundValues) {
      return {
        sd_additional_expenses: sdRefundValues.sd_additional_expenses,
        sd_additional_profits: sdRefundValues.sd_additional_profits,
        sd_refund_amount: sdRefundValues.sd_refund_amount,
        sd_refund_receipt_url: sdRefundValues.sd_refund_receipt_url || null,
      };
    }
    return {};
  }

  function isTransitionDisabled(toStatus: BookingStatus): boolean {
    const subForm = requiredSubForm(status, toStatus);
    if (subForm === 'pricing') return pricingValues === null;
    if (subForm === 'parking') return parkingValues === null;
    if (subForm === 'sd_refund') return sdRefundValues === null;
    return false;
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

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

  const needsPricing = transitions.some(
    (t) => requiredSubForm(status, t) === 'pricing',
  );
  const needsParking = transitions.some(
    (t) => requiredSubForm(status, t) === 'parking',
  );
  const needsSdRefund = transitions.some(
    (t) => requiredSubForm(status, t) === 'sd_refund',
  );

  return (
    <aside className="flex overflow-hidden flex-col gap-0 bg-white rounded-xl border shadow-sm border-slate-200">
      {/* ── Status header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 px-4 py-3.5">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
          Workflow Status
        </p>
        <StatusBadge status={status} />
        {booking.status_updated_at && (
          <p className="mt-1.5 text-[11px] text-slate-400">
            Updated {formatRelative(booking.status_updated_at)}
          </p>
        )}
      </div>

      {/* ── Pipeline stepper ──────────────────────────────────────────────── */}
      {pipeline.length > 0 && status !== 'CANCELLED' && (
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Progress
          </p>
          <PipelineStepper
            pipeline={pipeline}
            currentStatus={status}
            statusUpdatedAt={booking.status_updated_at}
          />
        </div>
      )}

      {/* ── Stage-specific sub-form ───────────────────────────────────────── */}
      {(needsPricing || needsParking || needsSdRefund) && (
        <div className="px-4 py-4 border-b border-slate-100">
          {needsPricing && (
            <ReviewPricingForm booking={booking} onChange={setPricingValues} />
          )}
          {needsParking && (
            <ParkingRequestForm booking={booking} onChange={setParkingValues} />
          )}
          {needsSdRefund && (
            <SdRefundForm booking={booking} onChange={setSdRefundValues} />
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

      {/* ── Transition actions ────────────────────────────────────────────── */}
      {!isTerminal && (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Actions
          </p>
          <div className="flex flex-col gap-4">
            {/* Backward — secondary recovery action. */}
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
                  <ArrowLeft className="size-4 shrink-0" />
                  <span>Back to {statusLabel(prev)}</span>
                </span>
              </button>
            )}

            {/* Forward — primary CTA. */}
            {next && (
              <button
                disabled={isTransitionDisabled(next) || transitionMut.isPending}
                onClick={() =>
                  setConfirm({
                    toStatus: next,
                    label: `Proceed to ${statusLabel(next)}`,
                  })
                }
                className={cn(
                  'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-1 transition-all',
                  isTransitionDisabled(next) || transitionMut.isPending
                    ? 'cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200'
                    : 'bg-blue-600 text-white ring-blue-600 hover:bg-blue-700 hover:ring-blue-700 shadow-sm',
                )}
              >
                <span>Proceed to {statusLabel(next)}</span>
                <ChevronRight className="size-4 shrink-0" />
              </button>
            )}

            {/* Cancel — always visible when non-terminal. */}
            <button
              disabled={cancelMut.isPending}
              onClick={() => setCancelConfirm(true)}
              className="flex items-center justify-between rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 hover:ring-red-300 transition-all disabled:opacity-50"
            >
              <span>Cancel Booking</span>
              <X className="size-4 shrink-0" />
            </button>

            {!next && !prev && (
              <p className="text-[11px] text-slate-400">
                No further pipeline steps are available for this booking.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Automation triggers (Q6.6) ───────────────────────────────────── */}
      {(showGmailPoll || showSdCron || showSdFormResend) && (
        <div className="border-t border-slate-100 px-4 py-3.5">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Automation Triggers
          </p>
          <p className="mb-2.5 text-[10.5px] text-slate-400 leading-relaxed">
            Use these when the scheduled automation is late or stuck. They run
            the same logic as the Supabase cron jobs.
          </p>
          <div className="flex flex-col gap-1.5">
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
                Run SD refund cron now
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
                Send SD refund form email now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal state footer */}
      {isTerminal && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-slate-400">
            This booking is in a terminal state — no further transitions are
            available.
          </p>
        </div>
      )}

      {/* ── Confirm transition modal ─────────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          title={confirm.label}
          description={`Transition from "${statusLabel(status)}" to "${statusLabel(confirm.toStatus)}". Checked dev-control side effects will fire.`}
          onConfirm={() => handleTransition(confirm.toStatus)}
          onCancel={() => setConfirm(null)}
          isLoading={transitionMut.isPending}
        />
      )}

      {/* ── Confirm cancel modal ─────────────────────────────────────────── */}
      {cancelConfirm && (
        <ConfirmModal
          title="Cancel Booking"
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
}: {
  pipeline: BookingStatus[];
  currentStatus: BookingStatus;
  statusUpdatedAt?: string | null;
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

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  isLoading,
  destructive = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  destructive?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/40 backdrop-blur-[2px]">
      <div className="p-5 w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <div className="flex gap-3 items-start">
          {destructive && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="text-red-600 size-4" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50',
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700',
            )}
          >
            {isLoading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
