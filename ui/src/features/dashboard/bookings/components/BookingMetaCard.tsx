import { formatRelative } from '@/utils/format/bookingDisplay';
import { InlineCopyIconButton } from '@/features/dashboard/bookings/components/InlineCopyIconButton';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';

type Props = {
  booking: BookingRow;
  onCopyBookingId: () => void;
  className?: string;
};

export function BookingMetaCard({ booking, onCopyBookingId, className }: Props) {
  return (
    <div className={cn('border-border bg-card rounded-xl border p-5 shadow-sm sm:p-6', className)}>
      <p className="text-muted-foreground mb-2 text-[10.5px] font-bold uppercase tracking-widest">
        Booking Meta
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground shrink-0 text-[11px]">Booking ID</span>
          <span className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1 gap-y-0.5 text-right">
            <span className="text-muted-foreground break-all font-mono text-[11px]">
              {booking.id}
            </span>
            <InlineCopyIconButton
              aria-label="Copy booking ID to clipboard"
              onClick={onCopyBookingId}
            />
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground shrink-0 text-[11px]">Created</span>
          <span className="text-muted-foreground text-right text-[11px]">
            {formatRelative(booking.created_at)}
          </span>
        </div>
        {booking.updated_at ? (
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground shrink-0 text-[11px]">Updated</span>
            <span className="text-muted-foreground text-right text-[11px]">
              {formatRelative(booking.updated_at)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
