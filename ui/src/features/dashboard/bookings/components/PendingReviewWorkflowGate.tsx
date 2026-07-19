/**
 * When status is PENDING_REVIEW, blocks the workflow rail until the admin
 * confirms the guest form was reviewed. Ack is stored in sessionStorage and
 * tied to `status_updated_at` (fallback `created_at`) so any return to this
 * status after a new server update requires re-confirmation.
 *
 * While still on PENDING_REVIEW, admins can use **Show confirmation step again**
 * to clear the session ack and bring the checkbox back without leaving the page.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { Checkbox } from '@/components/ui/checkbox';

const STORAGE_PREFIX = 'admin.pendingReviewWorkflowGate:v1:';

function gateStamp(booking: BookingRow): string {
  return (booking.status_updated_at ?? booking.created_at ?? '').trim();
}

function readStoredStamp(bookingId: string): string | null {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + bookingId);
  } catch {
    return null;
  }
}

function writeStoredStamp(bookingId: string, stamp: string) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + bookingId, stamp);
  } catch {
    /* private mode / quota */
  }
}

type Props = {
  booking: BookingRow;
  children: ReactNode;
  /** `inline` — flat row for kanban workflow dialog. */
  layout?: 'card' | 'inline';
};

export function PendingReviewWorkflowGate({ booking, children, layout = 'card' }: Props) {
  const stamp = gateStamp(booking);
  const isPendingReview = booking.status === 'PENDING_REVIEW';

  const [revealed, setRevealed] = useState(() => {
    if (!isPendingReview) return true;
    return readStoredStamp(booking.id) === stamp;
  });

  useEffect(() => {
    if (booking.status !== 'PENDING_REVIEW') {
      setRevealed(true);
      return;
    }
    setRevealed(readStoredStamp(booking.id) === stamp);
  }, [booking.id, booking.status, stamp]);

  const onConfirm = useCallback(() => {
    writeStoredStamp(booking.id, stamp);
    setRevealed(true);
  }, [booking.id, stamp]);

  if (!isPendingReview || revealed) {
    return <>{children}</>;
  }

  const checkboxId = `pending-review-workflow-gate-${booking.id}`;

  if (layout === 'inline') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <label
          htmlFor={checkboxId}
          className="border-border flex min-h-[44px] shrink-0 cursor-pointer items-start gap-3 border-b px-4 py-3"
        >
          <Checkbox
            id={checkboxId}
            onCheckedChange={(checked) => {
              if (checked) onConfirm();
            }}
            className="mt-0.5"
          />
          <span className="text-foreground text-sm leading-snug">
            I reviewed the guest submission and confirm details are accurate.
          </span>
        </label>
        {revealed ? children : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="text-[10.5px] font-bold uppercase tracking-widest text-amber-800/80 dark:text-amber-300">
        Pending review
      </p>
      <label
        htmlFor={checkboxId}
        className="-mx-1 mt-1 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-500/10"
      >
        <Checkbox
          id={checkboxId}
          onCheckedChange={(checked) => {
            if (checked) onConfirm();
          }}
          className="mt-1"
        />
        <span className="text-xs leading-snug text-amber-950 dark:text-amber-100">
          I reviewed the guest submission and confirm details, documents, and receipts are accurate.
        </span>
      </label>
    </div>
  );
}
