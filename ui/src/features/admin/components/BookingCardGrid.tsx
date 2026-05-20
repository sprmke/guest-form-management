import { useNavigate } from 'react-router-dom';
import { Car, Dog, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { bookingRequestsSurpriseDecor } from '@/features/admin/lib/bookingFlags';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  emptyExtraHint?: string | null;
};

/**
 * Card grid view for the bookings dashboard.
 * Mirrors the responsive grid pattern of property-management-app's
 * `PaymentsGridView` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)
 * but tuned for booking content density (richer guest + stay info).
 */
export function BookingCardGrid({
  rows,
  isLoading,
  error,
  isRefreshing,
  emptyExtraHint,
}: Props) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div
        className="flex flex-col gap-3 justify-center items-center py-20 text-center bg-white rounded-xl"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex justify-center items-center bg-red-50 rounded-full size-9">
          <span className="text-base font-black leading-none text-red-500">
            !
          </span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-800">
            Could not load bookings
          </p>
          <p className="mt-1 text-[12px] text-slate-400 max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <CardGridSkeleton />;

  if (rows.length === 0) {
    return (
      <div
        className="flex flex-col gap-3 justify-center items-center py-20 text-center bg-white rounded-xl"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex justify-center items-center rounded-full size-9 bg-slate-100">
          <span className="text-lg leading-none text-slate-400">∅</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-700">
            No bookings found
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            Adjust your filters or clear the search.
          </p>
          {emptyExtraHint ? (
            <p className="mt-2 text-[12px] text-slate-500 max-w-sm">
              {emptyExtraHint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      {rows.map((row) => (
        <BookingCard
          key={row.id}
          row={row}
          onOpen={() => navigate(`/bookings/${row.id}`)}
        />
      ))}
    </div>
  );
}

function BookingCard({ row, onOpen }: { row: BookingRow; onOpen: () => void }) {
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open booking for ${name}`}
      className={cn(
        'group relative bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
        'hover:-translate-y-0.5 outline-none',
        'focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top: mobile = status beside guest; sm+ = status above avatar + name */}
      <div className="space-y-4 p-4 pb-3">
        <StatusBadge
          status={row.status}
          className="w-fit max-w-full"
        />
        <div className="flex items-start justify-between gap-2 sm:justify-start">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
            <GuestAvatar
              name={name}
              validIdUrl={row.valid_id_url}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-tight text-slate-800 truncate">
                {name}
              </p>
              <p className="mt-[2px] text-[11px] leading-tight text-slate-400 truncate">
                {row.guest_email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Body: stay */}
      <div className="px-4 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stay
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-700 whitespace-nowrap">
            {formatBookingDateShort(row.check_in_date)}
            <span className="mx-1.5 text-slate-300 font-light">→</span>
            {formatBookingDate(row.check_out_date)}
          </p>
          <p className="mt-[2px] text-[11px] text-slate-400">
            {row.number_of_nights}{' '}
            {row.number_of_nights === 1 ? 'night' : 'nights'}
            <span className="mx-1.5 text-slate-300">·</span>
            {pax} {pax === 1 ? 'guest' : 'guests'}
          </p>
        </div>
      </div>

      {/* Footer: flags + amount */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderTop: '1px solid #f8fafc', background: '#fcfcfd' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {row.need_parking ? (
            <span
              title="Needs parking"
              aria-label="Needs parking"
              className="inline-flex items-center justify-center size-7 rounded-md bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70"
            >
              <Car className="size-4" aria-hidden />
            </span>
          ) : null}
          {row.has_pets ? (
            <span
              title="Has pets"
              aria-label="Has pets"
              className="inline-flex items-center justify-center size-7 rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70"
            >
              <Dog className="size-4" aria-hidden />
            </span>
          ) : null}
          {bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) ? (
            <span
              title="Surprise decor setup"
              aria-label="Surprise decor setup"
              className="inline-flex items-center justify-center size-7 rounded-md bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200/70"
            >
              <PartyPopper className="size-4" aria-hidden />
            </span>
          ) : null}
          {!row.need_parking &&
            !row.has_pets &&
            !bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) && (
            <span className="text-[11px] text-slate-300">No flags</span>
          )}
        </div>

        {row.booking_rate != null && (
          <span className="shrink-0 text-[12px] font-bold text-slate-700 tabular-nums">
            {formatMoney(row.booking_rate)}
          </span>
        )}
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            opacity: 1 - i * 0.06,
          }}
        >
          <div className="flex items-center gap-3 p-4 pb-3">
            <div className="rounded-full size-12 animate-pulse bg-slate-100 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 rounded-full bg-slate-100 animate-pulse w-2/3" />
              <div className="h-2.5 rounded-full bg-slate-100/70 animate-pulse w-3/4" />
            </div>
          </div>
          <div className="px-4 pb-3 space-y-2">
            <div className="w-24 h-5 rounded-md animate-pulse bg-slate-100" />
            <div className="w-3/4 h-3 rounded-full animate-pulse bg-slate-100" />
            <div className="w-1/2 h-2.5 rounded-full bg-slate-100/70 animate-pulse" />
          </div>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid #f8fafc', background: '#fcfcfd' }}
          >
            <div className="flex gap-1.5">
              <div className="rounded-md size-7 animate-pulse bg-slate-100" />
              <div className="rounded-md size-7 animate-pulse bg-slate-100" />
            </div>
            <div className="w-16 h-3 rounded-full animate-pulse bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
