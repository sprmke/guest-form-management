/**
 * Transition actions for the workflow rail.
 *
 * Three tiers, top to bottom:
 * 1. A back/forward pair on one axis — matched height, radius and type scale,
 *    with a left arrow on back and a right arrow on the primary so the row reads
 *    as a single direction control. These commit real status changes, unlike the
 *    deck header's arrows which only move the view, so they are deliberately a
 *    different shape and sit in their own footer.
 * 2. The step-scoped undo ("mark … incomplete"), quiet and full width.
 * 3. Cancel booking, below a rule, on a soft rose wash so it names itself as
 *    destructive at rest without competing with the primary CTA — booking-scoped,
 *    so it stays put regardless of which stage is on screen, and disappears for
 *    good once the guest has checked in (`canCancelBookingAtStatus`).
 *
 * The eligibility booleans still come from `useWorkflowActions`; only the
 * presentation is re-ranked. While the rail browses a passed stage, the two
 * transition tiers hide and Cancel is all that remains.
 */

import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  canCancelBookingAtStatus,
  statusLabel,
  type BookingStatus,
} from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
} from '@/features/dashboard/bookings/lib/workflow';
import {
  workflowBackActionClass,
  workflowPrimaryActionClass,
} from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import { shortDocStepLabel } from '@/features/dashboard/bookings/lib/workflowStageDeck';

import { cn } from '@/lib/utils';

type Props = {
  isModal: boolean;
  status: BookingStatus;
  isTerminal: boolean;
  isLiveView: boolean;
  transitionPending: boolean;
  inPendingDocuments: boolean;
  viewingPendingDocSub: boolean;
  prev: BookingStatus | null;
  next: BookingStatus | null;
  onOpenBackConfirm: (toStatus: BookingStatus) => void;
  selectedPendingDocCanMarkIncomplete: boolean;
  selectedPendingDocCanMarkComplete: boolean;
  selectedPendingDocRequired: boolean;
  selectedPendingDocCompleted: boolean;
  activePendingDocSubStatus: PendingDocNestedKey;
  activePendingDocLabel: string;
  onMarkPendingDocSubStatusIncomplete: (sub: PendingDocNestedKey) => void;
  onMarkPendingDocSubStatusComplete: (sub: PendingDocNestedKey) => void;
  showProceedToReadyForCheckin: boolean;
  pendingDocumentsComplete: boolean;
  onOpenForwardProceedConfirm: (toStatus: BookingStatus, label: string) => void;
  showLateParkingActions: boolean;
  livePipelineActions: boolean;
  isTransitionDisabled: (toStatus: BookingStatus) => boolean;
  cancelPending: boolean;
  onOpenCancelConfirm: () => void;
};

type PrimaryAction = {
  label: string;
  enabled: boolean;
  onSelect: () => void;
  /** Shown as a tooltip on the disabled CTA — why the forward step is blocked. */
  blockedHint?: string;
};

const quietRowClass =
  'focus-ring flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

/**
 * Forward CTA. A disabled native button swallows hover, so the blocked hint
 * lives on a wrapping trigger — the reason appears on hover/focus instead of
 * as a permanent caption under the row.
 */
function PrimaryCta({
  label,
  disabled,
  busy,
  blockedHint,
  onSelect,
}: {
  label: string;
  disabled: boolean;
  busy: boolean;
  blockedHint?: string;
  onSelect: () => void;
}) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-busy={busy || undefined}
      aria-label={blockedHint ? `${label}. ${blockedHint}` : undefined}
      className={cn(workflowPrimaryActionClass(!disabled), 'w-full min-w-0')}
    >
      <span className="min-w-0 leading-snug">{label}</span>
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      )}
    </button>
  );

  if (!blockedHint) {
    return <div className="min-w-0 flex-1">{button}</div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="min-w-0 flex-1">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          {blockedHint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WorkflowActionsBar({
  isModal,
  status,
  isTerminal,
  isLiveView,
  transitionPending,
  inPendingDocuments,
  viewingPendingDocSub,
  prev,
  next,
  onOpenBackConfirm,
  selectedPendingDocCanMarkIncomplete,
  selectedPendingDocCanMarkComplete,
  selectedPendingDocRequired,
  selectedPendingDocCompleted,
  activePendingDocSubStatus,
  activePendingDocLabel,
  onMarkPendingDocSubStatusIncomplete,
  onMarkPendingDocSubStatusComplete,
  showProceedToReadyForCheckin,
  pendingDocumentsComplete,
  onOpenForwardProceedConfirm,
  showLateParkingActions,
  livePipelineActions,
  isTransitionDisabled,
  cancelPending,
  onOpenCancelConfirm,
}: Props) {
  if (isTerminal) return null;

  const showCancel = canCancelBookingAtStatus(status);
  const showTransitions = isLiveView || isModal;
  const inDocStep = inPendingDocuments && viewingPendingDocSub;
  const activeDocShortLabel = shortDocStepLabel(activePendingDocLabel);
  const docStepNotRequired = inDocStep && !selectedPendingDocRequired;

  let primary: PrimaryAction | null = null;

  if (inDocStep && selectedPendingDocRequired && !selectedPendingDocCompleted) {
    primary = {
      label: `Mark ${activeDocShortLabel} complete`,
      enabled: selectedPendingDocCanMarkComplete,
      onSelect: () => onMarkPendingDocSubStatusComplete(activePendingDocSubStatus),
      blockedHint: `Fill in the ${activeDocShortLabel.toLowerCase()} details above first.`,
    };
  } else if (inDocStep && showProceedToReadyForCheckin) {
    primary = {
      label: 'Proceed to Ready for Check-in',
      enabled: pendingDocumentsComplete,
      onSelect: () =>
        onOpenForwardProceedConfirm('READY_FOR_CHECKIN', 'Proceed to Ready for Check-in'),
      blockedHint: 'Complete the remaining document steps to continue.',
    };
  } else if (showLateParkingActions) {
    primary = {
      label: `Mark ${shortDocStepLabel(statusLabel(PARKING_NESTED_KEY))} complete`,
      enabled: selectedPendingDocCanMarkComplete,
      onSelect: () => onMarkPendingDocSubStatusComplete(PARKING_NESTED_KEY),
      blockedHint: 'Fill in the parking details above first.',
    };
  } else if (livePipelineActions && next) {
    primary = {
      label: `Proceed to ${statusLabel(next)}`,
      enabled: !isTransitionDisabled(next),
      onSelect: () => onOpenForwardProceedConfirm(next, `Proceed to ${statusLabel(next)}`),
      blockedHint: 'Complete the details above to continue.',
    };
  }

  const backTo = (inDocStep || livePipelineActions) && prev ? prev : null;
  // One in-flight mutation locks the whole footer: a cancel and a transition
  // racing each other would land the booking somewhere neither host intended.
  const actionsBusy = transitionPending || cancelPending;
  const primaryDisabled = !primary?.enabled || actionsBusy;

  const showMarkIncomplete = showTransitions && inDocStep && selectedPendingDocCanMarkIncomplete;
  const showTransitionRow = showTransitions && (primary !== null || backTo !== null);
  const showNotRequiredNote = showTransitions && docStepNotRequired && primary === null;
  const showDeadEndNote =
    showTransitions && !showTransitionRow && !showNotRequiredNote && !showMarkIncomplete;

  const hasStageActions =
    showTransitionRow || showNotRequiredNote || showDeadEndNote || showMarkIncomplete;
  if (!hasStageActions && !showCancel) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        isModal ? 'border-border mt-auto shrink-0 border-t pt-5' : 'px-4 py-4'
      )}
    >
      {showNotRequiredNote ? (
        <p className="border-border/50 bg-muted/50 text-muted-foreground flex min-h-[44px] items-center rounded-xl border px-3.5 py-2.5 text-sm">
          {activePendingDocLabel} is not required for this booking.
        </p>
      ) : null}

      {showTransitionRow ? (
        <div className="flex items-stretch gap-2">
          {backTo ? (
            <button
              type="button"
              disabled={actionsBusy}
              onClick={() => onOpenBackConfirm(backTo)}
              aria-label={`Move back to ${statusLabel(backTo)}`}
              title={`Move back to ${statusLabel(backTo)}`}
              className={cn(workflowBackActionClass, primary ? undefined : 'flex-1')}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              {primary ? 'Back' : `Back to ${statusLabel(backTo)}`}
            </button>
          ) : null}

          {primary ? (
            <PrimaryCta
              label={primary.label}
              disabled={primaryDisabled}
              busy={transitionPending}
              blockedHint={!primary.enabled && !actionsBusy ? primary.blockedHint : undefined}
              onSelect={primary.onSelect}
            />
          ) : null}
        </div>
      ) : null}

      {showMarkIncomplete ? (
        <button
          type="button"
          disabled={actionsBusy}
          onClick={() => onMarkPendingDocSubStatusIncomplete(activePendingDocSubStatus)}
          className={cn(
            quietRowClass,
            'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <RotateCcw className="size-3.5 shrink-0" aria-hidden />
          Mark {activeDocShortLabel} incomplete
        </button>
      ) : null}

      {showDeadEndNote ? (
        <p className="text-caption">No further pipeline steps are available for this booking.</p>
      ) : null}

      {showCancel ? (
        <div className={cn(hasStageActions && 'border-separator mt-1 border-t pt-2.5')}>
          <button
            type="button"
            disabled={actionsBusy}
            onClick={onOpenCancelConfirm}
            aria-busy={cancelPending || undefined}
            className={cn(
              quietRowClass,
              'bg-rose-500/10 text-rose-600 hover:bg-rose-500/[0.18] dark:text-rose-400 dark:hover:bg-rose-500/20'
            )}
          >
            {cancelPending ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : null}
            Cancel booking
          </button>
        </div>
      ) : null}
    </div>
  );
}
