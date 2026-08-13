/**
 * Confirm dialog for workflow Proceed / Back / Cancel actions.
 */

import type { ReactNode } from 'react';

import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

import { statusLabel, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';

import { cn } from '@/lib/utils';

/** One-line summary for transition confirms — status names in semibold, not quotes. */
export function WorkflowStatusTransitionDescription({
  fromStatus,
  toStatus,
}: {
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
}) {
  return (
    <>
      Move from <span className="text-foreground font-semibold">{statusLabel(fromStatus)}</span>
      {' to '}
      <span className="text-foreground font-semibold">{statusLabel(toStatus)}</span>.
    </>
  );
}

export function WorkflowConfirmModal({
  title,
  description,
  effectLines,
  banner,
  secondaryLabel = 'Back',
  onConfirm,
  onCancel,
  isLoading,
  destructive = false,
}: {
  title: string;
  description: ReactNode;
  /** Short host-facing bullets describing what will happen on confirm. */
  effectLines?: string[];
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
              {effectLines && effectLines.length > 0 ? (
                <>
                  <p className="text-muted-foreground mt-3 text-sm">
                    This action will do the following items:
                  </p>
                  <ul className="text-muted-foreground mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed">
                    {effectLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-5 flex shrink-0 justify-end gap-2">
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
