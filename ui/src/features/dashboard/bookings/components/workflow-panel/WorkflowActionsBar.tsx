/**
 * Transition actions bar — ported from the pre-decomposition `WorkflowPanel.tsx`.
 * Proceed/Back/Mark Complete-Incomplete/Cancel button stack. Container
 * treatment differs rail vs. modal (`px-4 py-4` vs. sticky `mt-auto border-t`
 * footer) — preserved exactly.
 */

import { ArrowLeft, ChevronRight, Loader2, RotateCcw, X } from 'lucide-react';

import { statusLabel, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
} from '@/features/dashboard/bookings/lib/workflow';
import {
  workflowBackActionClass,
  workflowDestructiveActionClass,
  workflowPrimaryActionClass,
  workflowWarningActionClass,
} from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';

import { cn } from '@/lib/utils';

type Props = {
  isModal: boolean;
  isTerminal: boolean;
  isLiveView: boolean;
  status: BookingStatus;
  onReturnToLiveStep: () => void;
  transitionPending: boolean;
  inPendingDocuments: boolean;
  viewingPendingDocSub: boolean;
  prev: BookingStatus | null;
  next: BookingStatus | null;
  onOpenBackConfirm: (toStatus: BookingStatus) => void;
  selectedPendingDocCanMarkIncomplete: boolean;
  selectedPendingDocCanMarkComplete: boolean;
  selectedPendingDocRequired: boolean;
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

export function WorkflowActionsBar({
  isModal,
  isTerminal,
  isLiveView,
  status,
  onReturnToLiveStep,
  transitionPending,
  inPendingDocuments,
  viewingPendingDocSub,
  prev,
  next,
  onOpenBackConfirm,
  selectedPendingDocCanMarkIncomplete,
  selectedPendingDocCanMarkComplete,
  selectedPendingDocRequired,
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

  return (
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
            disabled={transitionPending}
            onClick={onReturnToLiveStep}
            className={workflowPrimaryActionClass(!transitionPending)}
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
                  disabled={transitionPending}
                  onClick={() => onOpenBackConfirm(prev)}
                  className={workflowBackActionClass()}
                >
                  <span className="min-w-0 pr-2 text-left">Back to {statusLabel(prev)}</span>
                  {transitionPending ? (
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
                    disabled={transitionPending}
                    onClick={() => onMarkPendingDocSubStatusIncomplete(activePendingDocSubStatus)}
                    className={workflowWarningActionClass()}
                  >
                    <span className="min-w-0 pr-2 text-left">
                      Mark as Incomplete - {activePendingDocLabel}
                    </span>
                    {transitionPending ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-amber-700" />
                    ) : (
                      <RotateCcw className="size-4 shrink-0 text-amber-700" aria-hidden />
                    )}
                  </button>
                ) : !selectedPendingDocRequired ? (
                  <p className="border-border/50 bg-muted/50 text-muted-foreground flex min-h-[44px] items-center rounded-xl border px-3.5 py-2.5 text-sm">
                    {activePendingDocLabel} is not required for this booking.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedPendingDocCanMarkComplete || transitionPending}
                    onClick={() => onMarkPendingDocSubStatusComplete(activePendingDocSubStatus)}
                    className={workflowPrimaryActionClass(
                      selectedPendingDocCanMarkComplete && !transitionPending
                    )}
                  >
                    <span className="min-w-0 pr-2 text-left">
                      Mark as Complete - {activePendingDocLabel}
                    </span>
                    {transitionPending ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" />
                    )}
                  </button>
                )}
              </div>
              {showProceedToReadyForCheckin && (
                <button
                  disabled={!pendingDocumentsComplete || transitionPending}
                  onClick={() =>
                    onOpenForwardProceedConfirm(
                      'READY_FOR_CHECKIN',
                      'Proceed to Ready for Check-in'
                    )
                  }
                  className={workflowPrimaryActionClass(
                    pendingDocumentsComplete && !transitionPending
                  )}
                >
                  <span className="min-w-0 pr-2 text-left">Proceed to Ready for Check-in</span>
                  {transitionPending ? (
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
                disabled={!selectedPendingDocCanMarkComplete || transitionPending}
                onClick={() => onMarkPendingDocSubStatusComplete(PARKING_NESTED_KEY)}
                className={workflowPrimaryActionClass(
                  selectedPendingDocCanMarkComplete && !transitionPending
                )}
              >
                <span className="min-w-0 pr-2 text-left">
                  Mark as Complete - {statusLabel('PENDING_PARKING_REQUEST')}
                </span>
                {transitionPending ? (
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
              disabled={transitionPending}
              onClick={() => onOpenBackConfirm(prev)}
              className={workflowBackActionClass()}
            >
              <span className="min-w-0 pr-2 text-left">Back to {statusLabel(prev)}</span>
              {transitionPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <ArrowLeft className="size-4 shrink-0" aria-hidden />
              )}
            </button>
          )}

          {/* Forward — primary CTA. */}
          {livePipelineActions && next && (
            <button
              disabled={isTransitionDisabled(next) || transitionPending}
              onClick={() => onOpenForwardProceedConfirm(next, `Proceed to ${statusLabel(next)}`)}
              className={workflowPrimaryActionClass(
                !isTransitionDisabled(next) && !transitionPending
              )}
            >
              <span className="min-w-0 pr-2 text-left">Proceed to {statusLabel(next)}</span>
              {transitionPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              )}
            </button>
          )}

          <button
            disabled={cancelPending}
            onClick={onOpenCancelConfirm}
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
  );
}
