import { useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { BookingDetailAssetPreviewModal } from '@/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal';
import { WorkflowPanel } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPanel';
import { useBooking } from '@/features/dashboard/bookings/hooks/useBooking';
import { useBookingAssetPreview } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { ResponsiveModal, ResponsiveModalContent } from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

type Props = {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kanban column drop target — skips the workflow shell and opens confirm or required form. */
  targetStatus?: BookingStatus | null;
  /** Optional list row for instant header while detail loads. */
  previewRow?: BookingRow | null;
};

function KanbanWorkflowLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-4">
      <div className="text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

export function BookingKanbanWorkflowModal({
  bookingId,
  open,
  onOpenChange,
  targetStatus = null,
  previewRow,
}: Props) {
  const [dropShellHidden, setDropShellHidden] = useState(false);
  const {
    data: booking,
    isLoading,
    error,
  } = useBooking(open ? (bookingId ?? undefined) : undefined);
  const { previewAsset, previewLoading, handlePreview, closePreview } = useBookingAssetPreview();
  const displayRow = booking ?? previewRow ?? null;
  const isDropTransition = !!targetStatus;

  useEffect(() => {
    if (!open) setDropShellHidden(false);
  }, [open]);

  const handleClose = () => onOpenChange(false);

  const workflowPanel =
    booking && displayRow ? (
      <WorkflowPanel
        booking={booking}
        variant="modal"
        kanbanTargetStatus={targetStatus}
        onKanbanFlowClose={handleClose}
        onKanbanShellHidden={isDropTransition ? setDropShellHidden : undefined}
        onPreview={handlePreview}
      />
    ) : null;

  const assetPreview = (
    <BookingDetailAssetPreviewModal
      asset={previewAsset}
      booking={booking ?? null}
      isReceiptAiBackfilling={false}
      loading={previewLoading}
      onClose={closePreview}
    />
  );

  if (!open) return null;

  if (isDropTransition && dropShellHidden) {
    return (
      <>
        {isLoading && !displayRow ? <KanbanWorkflowLoadingOverlay /> : null}
        {error && !booking ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-4">
            <p className="text-destructive bg-card rounded-xl border px-4 py-3 text-sm shadow-lg">
              Could not load booking.
            </p>
          </div>
        ) : null}
        {workflowPanel}
        {assetPreview}
      </>
    );
  }

  if (isDropTransition) {
    return (
      <>
        <ResponsiveModal open={open} onOpenChange={onOpenChange}>
          <ResponsiveModalContent
            sheetLayout="split"
            className={cn(
              'flex max-h-[min(92dvh,36rem)] w-full max-w-[min(calc(100vw-1.5rem),32rem)] flex-col gap-0 overflow-hidden p-0',
              'sm:max-w-lg'
            )}
          >
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

            {workflowPanel}
          </ResponsiveModalContent>
        </ResponsiveModal>
        {assetPreview}
      </>
    );
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
        className={cn(
          'flex max-h-[min(92dvh,36rem)] w-full max-w-[min(calc(100vw-1.5rem),32rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-lg'
        )}
      >
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

        {workflowPanel}
      </ResponsiveModalContent>
      {assetPreview}
    </ResponsiveModal>
  );
}
