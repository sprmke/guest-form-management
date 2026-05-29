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
import type { BookingRow } from '@/features/admin/lib/types';

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
};

export function PendingReviewWorkflowGate({ booking, children }: Props) {
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

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-widest text-amber-800/80 dark:text-amber-300">
        Pending review
      </p>
      <label
        htmlFor={checkboxId}
        className="mt-1 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-2 -mx-1 hover:bg-amber-100/50 dark:hover:bg-amber-500/10"
      >
        <input
          id={checkboxId}
          type="checkbox"
          onChange={(e) => {
            if (e.target.checked) onConfirm();
          }}
          className="mt-1 size-4 shrink-0 rounded border-border text-blue-600 focus:ring-blue-500/40 dark:border-amber-400/40"
        />
        <span className="text-xs leading-snug text-amber-950 dark:text-amber-100">
          I have reviewed the guest's booking submission and confirm that all
          provided details, attached documents and receipts are accurate and
          valid.
        </span>
      </label>
    </div>
  );
}
