import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Car, Dog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
  formatRelative,
} from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
};

export function BookingTable({ rows, isLoading, error, isRefreshing }: Props) {
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

  if (isLoading) return <TableSkeleton />;

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
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl overflow-hidden transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #f1f5f9',
                background: '#fafafa',
              }}
            >
              <Th className="pr-3 pl-4 sm:pl-5">Status</Th>
              <Th className="px-3 sm:px-4">Guest</Th>
              <Th className="px-3 sm:px-4">Stay</Th>
              <Th className="hidden px-3 text-right sm:px-4 md:table-cell">
                Pax
              </Th>
              <Th className="hidden px-3 text-center sm:px-4 sm:table-cell">
                Flags
              </Th>
              <Th className="hidden px-3 text-right sm:px-4 lg:table-cell">
                Amount
              </Th>
              <Th className="hidden px-3 text-right sm:px-4 md:table-cell">
                Added
              </Th>
              <Th className="pr-3 pl-2 text-right sm:pr-4 sm:pl-3">
                <span className="sr-only">View</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <BookingTableRow
                key={row.id}
                row={row}
                index={i}
                onOpen={() => navigate(`/bookings/${row.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'py-[11px] text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400',
        className,
      )}
    >
      {children}
    </th>
  );
}

function BookingTableRow({
  row,
  index,
  onOpen,
}: {
  row: BookingRow;
  index: number;
  onOpen: () => void;
}) {
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';
  const pax = (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);

  const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open booking for ${name}`}
      className={cn(
        'group cursor-pointer transition-colors duration-100 outline-none',
        'hover:bg-sidebar-accent/30 focus-visible:bg-sidebar-accent/40',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-primary/40',
      )}
      style={{ borderTop: index === 0 ? undefined : '1px solid #f8fafc' }}
    >
      {/* Status */}
      <td className="pl-4 sm:pl-5 pr-3 py-3 sm:py-3.5 align-middle">
        <div className="inline-flex flex-col gap-1">
          <StatusBadge status={row.status} />
          {row.is_test_booking && (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
              TEST
            </span>
          )}
        </div>
      </td>

      {/* Guest — with avatar */}
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 align-middle">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-[140px] sm:min-w-[160px]">
          <GuestAvatar name={name} validIdUrl={row.valid_id_url} size="md" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">
              {name}
            </p>
            <p className="mt-[2px] text-[11px] text-slate-400 leading-tight truncate">
              {row.guest_email}
            </p>
          </div>
        </div>
      </td>

      {/* Stay */}
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 align-middle whitespace-nowrap">
        <p className="text-[13px] font-semibold text-slate-700">
          {formatBookingDateShort(row.check_in_date)}
          <span className="mx-1.5 text-slate-300 font-light">→</span>
          {formatBookingDate(row.check_out_date)}
        </p>
        <p className="mt-[2px] text-[11px] text-slate-400">
          {row.number_of_nights}{' '}
          {row.number_of_nights === 1 ? 'night' : 'nights'}
        </p>
      </td>

      {/* Pax */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-right align-middle tabular-nums md:table-cell">
        <span className="text-[13px] font-semibold text-slate-600">{pax}</span>
      </td>

      {/* Flags — bigger, more legible icons */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-center align-middle sm:table-cell">
        <div className="inline-flex gap-1.5 justify-center items-center">
          {row.need_parking && (
            <span
              title="Needs parking"
              aria-label="Needs parking"
              className="inline-flex items-center justify-center size-7 rounded-md bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70"
            >
              <Car className="size-4" aria-hidden />
            </span>
          )}
          {row.has_pets && (
            <span
              title="Has pets"
              aria-label="Has pets"
              className="inline-flex items-center justify-center size-7 rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70"
            >
              <Dog className="size-4" aria-hidden />
            </span>
          )}
          {!row.need_parking && !row.has_pets && (
            <span className="text-slate-200 text-[14px] leading-none">—</span>
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-right align-middle lg:table-cell tabular-nums">
        <span
          className={cn(
            'text-[13px] font-semibold',
            row.booking_rate == null ? 'text-slate-300' : 'text-slate-700',
          )}
        >
          {formatMoney(row.booking_rate)}
        </span>
      </td>

      {/* Created */}
      <td className="hidden px-3 sm:px-4 py-3.5 text-right align-middle md:table-cell whitespace-nowrap">
        <span className="text-[12px] text-slate-400">
          {formatRelative(row.created_at)}
        </span>
      </td>

      {/* Action — chevron only, click is handled by the whole row */}
      <td className="py-2 pr-3 pl-2 text-right align-middle sm:pr-4">
        <span
          aria-hidden
          className={cn(
            'inline-flex items-center justify-center rounded-lg',
            'min-w-[44px] min-h-[44px] text-slate-400',
            'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100',
            'transition-opacity duration-150',
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div
      className="overflow-hidden bg-white rounded-xl"
      style={{ border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <div
        className="flex gap-6 items-center px-5 py-[11px]"
        style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}
      >
        {[72, 120, 150, 48, 60, 72].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-slate-200 animate-pulse shrink-0"
            style={{ width: w, opacity: 0.6 }}
          />
        ))}
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 items-center px-5 py-4"
          style={{
            borderTop: i === 0 ? undefined : '1px solid #f8fafc',
            opacity: 1 - i * 0.1,
          }}
        >
          <div className="w-24 h-5 rounded-md animate-pulse bg-slate-100" />
          <div className="flex flex-1 gap-3 items-center">
            <div className="rounded-full animate-pulse size-9 bg-slate-100 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-3 rounded-full animate-pulse bg-slate-100" />
              <div className="h-2.5 rounded-full bg-slate-100/70 animate-pulse w-40" />
            </div>
          </div>
          <div className="hidden w-36 h-3 rounded-full animate-pulse md:block bg-slate-100" />
          <div className="ml-auto w-14 h-7 rounded-lg animate-pulse bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
