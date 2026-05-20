import { InlineCopyIconButton } from '@/features/admin/components/SdRefundForm';
import { formatRelative } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  booking: BookingRow;
  onCopyBookingId: () => void;
  className?: string;
};

export function BookingMetaCard({
  booking,
  onCopyBookingId,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm',
        className,
      )}
    >
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
        Booking Meta
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-[11px] text-slate-400">Booking ID</span>
          <span className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1 gap-y-0.5 text-right">
            <span className="font-mono text-[11px] text-slate-600 break-all">
              {booking.id}
            </span>
            <InlineCopyIconButton
              aria-label="Copy booking ID to clipboard"
              onClick={onCopyBookingId}
            />
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-[11px] text-slate-400">Created</span>
          <span className="text-right text-[11px] text-slate-600">
            {formatRelative(booking.created_at)}
          </span>
        </div>
        {booking.updated_at ? (
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-[11px] text-slate-400">Updated</span>
            <span className="text-right text-[11px] text-slate-600">
              {formatRelative(booking.updated_at)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
