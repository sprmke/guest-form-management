import { formatBookingDateShort } from '@/utils/format/bookingDisplay';
import { Link } from 'react-router-dom';

import { ExternalLink, Loader2 } from 'lucide-react';

import { PendingReviewWorkflowGate } from '@/features/dashboard/bookings/components/PendingReviewWorkflowGate';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { WorkflowPanel } from '@/features/dashboard/bookings/components/WorkflowPanel';
import { useBooking } from '@/features/dashboard/bookings/hooks/useBooking';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { bookingDetailPath } from '@/features/dashboard/org/lib/tenantPaths';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional list row for instant header while detail loads. */
  previewRow?: BookingRow | null;
};

function modalGuestName(row: BookingRow): string {
  return row.primary_guest_name || row.guest_facebook_name || row.guest_email || 'Guest';
}

export function BookingKanbanWorkflowModal({ bookingId, open, onOpenChange, previewRow }: Props) {
  const { orgSlug, propertySlug } = useOrgContext();
  const {
    data: booking,
    isLoading,
    error,
  } = useBooking(open ? (bookingId ?? undefined) : undefined);
  const displayRow = booking ?? previewRow ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(90dvh,36rem)] w-full max-w-[min(calc(100vw-1.5rem),32rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-lg'
        )}
      >
        <DialogHeader className="border-border shrink-0 space-y-0 border-b pb-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold leading-tight sm:text-lg">
                {displayRow ? modalGuestName(displayRow) : 'Booking'}
              </DialogTitle>
              {displayRow ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground truncate text-xs">
                    {formatBookingDateShort(displayRow.check_in_date)}
                    {' → '}
                    {formatBookingDateShort(displayRow.check_out_date)}
                  </p>
                  <StatusBadge status={displayRow.status} />
                </div>
              ) : null}
            </div>
            {bookingId ? (
              <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5" asChild>
                <Link
                  to={bookingDetailPath(orgSlug, propertySlug, bookingId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open booking
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isLoading && !displayRow ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span className="text-sm">Loading…</span>
            </div>
          ) : null}

          {error && !booking ? (
            <div className="text-destructive flex flex-1 items-center justify-center px-4 py-8 text-center text-sm">
              Could not load booking.
            </div>
          ) : null}

          {booking ? (
            <PendingReviewWorkflowGate booking={booking} layout="inline">
              <WorkflowPanel booking={booking} variant="modal" />
            </PendingReviewWorkflowGate>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
