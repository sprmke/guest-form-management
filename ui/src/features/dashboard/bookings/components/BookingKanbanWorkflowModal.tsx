import { Link } from 'react-router-dom';

import { ExternalLink, Loader2 } from 'lucide-react';

import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { BookingDetailAssetPreviewModal } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal';
import { WorkflowPanel } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPanel';
import { useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import { useBookingAssetPreview } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { resolveBookingListHref } from '@/features/dashboard/bookings/lib/bookingListNavigation';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';
import { formatBookingDateShort } from '@/utils/format/bookingDisplay';

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
  const orgContext = useOptionalOrgContext();
  const orgSlug = useOrgSlugParam();
  const {
    data: booking,
    isLoading,
    error,
  } = useBooking(open ? (bookingId ?? undefined) : undefined);
  const { previewAsset, previewLoading, handlePreview, closePreview } = useBookingAssetPreview();
  const displayRow = booking ?? previewRow ?? null;
  const detailHref =
    bookingId && displayRow
      ? resolveBookingListHref(displayRow, {
          orgSlug,
          propertySlug: orgContext?.propertySlug,
          scope: orgContext ? 'property' : 'org',
        })
      : null;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
        className={cn(
          'flex max-h-[min(92dvh,36rem)] w-full max-w-[min(calc(100vw-1.5rem),32rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-lg'
        )}
      >
        <ResponsiveModalHeader className="border-border shrink-0 space-y-0 border-b px-4 pb-4 pt-1 text-left sm:px-5 sm:pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <ResponsiveModalTitle className="truncate text-base font-semibold leading-tight sm:text-lg">
                {displayRow ? modalGuestName(displayRow) : 'Booking'}
              </ResponsiveModalTitle>
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
            {detailHref ? (
              <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5" asChild>
                <Link to={detailHref} target="_blank" rel="noopener noreferrer">
                  Open booking
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        </ResponsiveModalHeader>

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
            <WorkflowPanel booking={booking} variant="modal" onPreview={handlePreview} />
          ) : null}
        </div>
      </ResponsiveModalContent>
      <BookingDetailAssetPreviewModal
        asset={previewAsset}
        booking={booking ?? null}
        isReceiptAiBackfilling={false}
        loading={previewLoading}
        onClose={closePreview}
      />
    </ResponsiveModal>
  );
}
