import {
  Calendar,
  Car,
  ChevronDown,
  Dog,
  Edit2,
  PartyPopper,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBookingDate } from '@/features/admin/lib/formatters';
import { bookingRequestsSurpriseDecor } from '@/features/admin/lib/bookingFlags';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  booking: BookingRow;
  editMode: boolean;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  className?: string;
};

/**
 * Compact booking strip for mobile detail when status is past Pending Review.
 * Keeps workflow (Progress) above the fold; full cards live in the collapsible below.
 */
export function BookingDetailMobileSummary({
  booking,
  editMode,
  detailsExpanded,
  onToggleDetails,
  onEdit,
  onCancelEdit,
  className,
}: Props) {
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const fb = booking.guest_facebook_name?.trim() ?? '';
  const primary = booking.primary_guest_name?.trim() ?? '';
  const heading = fb || primary || 'Booking';
  const hasDecor = bookingRequestsSurpriseDecor(
    booking.guest_requests_surprise_decor,
  );

  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4',
        className,
      )}
      aria-label="Booking summary"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-snug text-slate-900 break-words">
            {heading}
          </h1>
          {fb && primary && fb.toLowerCase() !== primary.toLowerCase() && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {primary}
            </p>
          )}
        </div>
        {editMode ? (
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel editing"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit booking"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Edit2 className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3.5 shrink-0 text-slate-400" aria-hidden />
          {formatBookingDate(booking.check_in_date)}
          <span className="text-slate-300" aria-hidden>
            →
          </span>
          {formatBookingDate(booking.check_out_date)}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Users className="size-3.5 shrink-0 text-slate-400" aria-hidden />
          {pax} pax · {booking.number_of_nights}{' '}
          {booking.number_of_nights === 1 ? 'night' : 'nights'}
        </span>
      </p>

      {(booking.need_parking || booking.has_pets || hasDecor) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {booking.need_parking && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200/80">
              <Car className="size-3" aria-hidden />
              Parking
            </span>
          )}
          {booking.has_pets && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
              <Dog className="size-3" aria-hidden />
              Pets
            </span>
          )}
          {hasDecor && (
            <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200/80">
              <PartyPopper className="size-3" aria-hidden />
              Decor
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleDetails}
        aria-expanded={detailsExpanded}
        aria-controls="booking-detail-full-panel"
        className={cn(
          'mt-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors',
          detailsExpanded
            ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            : 'border border-sidebar-primary/30 bg-sidebar-primary/5 text-sidebar-primary hover:bg-sidebar-primary/10',
        )}
      >
        <span>
          {detailsExpanded ? 'Hide full booking details' : 'View full booking details'}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
            detailsExpanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
    </section>
  );
}
