import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookingPricingSummary,
  type BookingPricingSummarySource,
} from '@/features/admin/components/BookingPricingSummary';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import {
  formatBookingDate,
  formatBookingDateShort,
} from '@/features/admin/lib/formatters';
import type { FinanceBookingLedgerRow } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  row: FinanceBookingLedgerRow | null;
  onClose: () => void;
};

function toPricingSource(row: FinanceBookingLedgerRow): BookingPricingSummarySource {
  return {
    status: row.status,
    has_pets: row.has_pets,
    need_parking: row.need_parking,
    ...row.pricing,
  };
}

function StayFinanceModalMeta({ row }: { row: FinanceBookingLedgerRow }) {
  const nights =
    row.number_of_nights != null &&
    Number.isFinite(row.number_of_nights) &&
    row.number_of_nights > 0
      ? row.number_of_nights
      : null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
      <p className="text-sm font-semibold leading-snug text-foreground">
        <span className="whitespace-nowrap">
          {formatBookingDateShort(row.check_in_date)}
        </span>
        {row.check_out_date ? (
          <>
            <span className="mx-1.5 font-light text-muted-foreground/50">→</span>
            <span className="whitespace-nowrap">
              {formatBookingDate(row.check_out_date)}
            </span>
          </>
        ) : null}
      </p>
      {nights != null ? (
        <p className="text-xs font-normal leading-snug text-muted-foreground sm:text-sm">
          {nights} {nights === 1 ? 'night' : 'nights'}
        </p>
      ) : null}
      <StatusBadge status={row.status} className="w-fit shrink-0" />
    </div>
  );
}

export function StayFinanceModal({ row, onClose }: Props) {
  const guestLabel = row ? bookingListDisplayName(row) : '';

  return (
    <Dialog
      open={row != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          '!flex !h-auto !w-full !max-w-[min(calc(100vw-1.5rem),36rem)] !flex-col !gap-0 !overflow-hidden !p-0',
          '!max-h-[90dvh] sm:!max-w-[36rem]',
        )}
        aria-describedby={undefined}
      >
        {row ? (
          <>
            <DialogHeader className="shrink-0 gap-2 border-b border-separator px-4 pb-4 pt-4 pr-14 sm:gap-2.5 sm:px-5 sm:pt-5">
              <DialogTitle className="truncate text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                {guestLabel}
              </DialogTitle>
              <StayFinanceModalMeta row={row} />
            </DialogHeader>

            <div className="max-h-[calc(90dvh-13.5rem)] overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <BookingPricingSummary
                booking={toPricingSource(row)}
                layout="modal"
                showProjectedEstimate
              />
            </div>

            <div className="shrink-0 border-t border-separator px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <Link
                to={`/bookings/${row.id}`}
                className={cn(
                  'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg',
                  'gradient-primary text-[13px] font-semibold text-primary-foreground shadow-soft',
                  'transition-all duration-200 hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]',
                )}
              >
                <ExternalLink className="size-4" aria-hidden />
                Open booking
              </Link>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
