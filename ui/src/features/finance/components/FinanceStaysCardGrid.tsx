import { FinanceStaysCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { AdminTableFlagsCell } from '@/features/admin/components/AdminDataTable';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { financeDisplayNet, hostNetToneClass } from '@/features/admin/lib/bookingFinance';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import {
  formatBookingDate,
  formatBookingDateShort,
  formatMoney,
} from '@/features/admin/lib/formatters';
import type { FinanceBookingLedgerRow } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  rows: FinanceBookingLedgerRow[];
  isLoading: boolean;
  isRefreshing?: boolean;
  onOpenRow: (row: FinanceBookingLedgerRow) => void;
};

export function FinanceStaysCardGrid({
  rows,
  isLoading,
  isRefreshing = false,
  onOpenRow,
}: Props) {
  if (isLoading) return <FinanceStaysCardGridSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card py-20 text-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <span className="text-lg leading-none text-muted-foreground">∅</span>
        </div>
        <div>
          <p className="text-section-title font-bold text-foreground">
            No stays in this period
          </p>
          <p className="mt-1 text-caption">
            Adjust dates or remove filters to see results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60',
      )}
    >
      {rows.map((row) => (
        <FinanceStayCard
          key={row.id}
          row={row}
          onOpen={() => onOpenRow(row)}
        />
      ))}
    </div>
  );
}

function StayDatesAndFlags({
  checkInDate,
  checkOutDate,
  nightsLabel,
  need_parking,
  has_pets,
  guest_requests_surprise_decor,
}: {
  checkInDate: string;
  checkOutDate: string;
  nightsLabel: string;
  need_parking: boolean;
  has_pets: boolean;
  guest_requests_surprise_decor: unknown;
}) {
  const flagsProps = {
    need_parking,
    has_pets,
    guest_requests_surprise_decor,
  };
  const dateLine = (
    <>
      <span className="whitespace-nowrap text-data-primary">
        {formatBookingDateShort(checkInDate)}
        <span className="mx-1 font-light text-muted-foreground/50">→</span>
        {formatBookingDate(checkOutDate)}
      </span>
      <span className="mx-1.5 text-muted-foreground/40">·</span>
      {nightsLabel}
    </>
  );

  return (
    <>
      {/* Mobile (1-col grid): dates left, flags right */}
      <div className="mt-1 flex items-center justify-between gap-2 text-data-secondary sm:hidden">
        <span className="min-w-0 flex-1">{dateLine}</span>
        <span className="shrink-0">
          <AdminTableFlagsCell {...flagsProps} hideEmpty />
        </span>
      </div>

      {/* Tablet+ (2+ cols): flags on their own line, left-aligned */}
      <div className="mt-1 hidden text-data-secondary sm:block">
        <p>{dateLine}</p>
        <div className="mt-1.5 flex justify-start">
          <AdminTableFlagsCell {...flagsProps} />
        </div>
      </div>
    </>
  );
}

function FinanceStayCard({
  row,
  onOpen,
}: {
  row: FinanceBookingLedgerRow;
  onOpen: () => void;
}) {
  const fin = row.financials;
  const netDisplay = financeDisplayNet(fin);
  const isRealized = fin.isCompleted;
  const name = bookingListDisplayName(row);
  const nightsLabel =
    row.number_of_nights === 1 ? '1 night' : `${row.number_of_nights} nights`;

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  const netClass = hostNetToneClass(netDisplay, isRealized);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open finance details for ${name}`}
      className={cn(
        'cursor-pointer rounded-xl border border-border/50 bg-card p-3.5 transition-all duration-200 sm:p-4',
        'hover:-translate-y-0.5 hover:border-border outline-none',
        'focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
    >
      <StatusBadge status={row.status} className="w-fit max-w-full" />
      <p className="mt-2 truncate text-sm font-bold leading-tight text-foreground">
        {name}
      </p>
      <StayDatesAndFlags
        checkInDate={row.check_in_date}
        checkOutDate={row.check_out_date}
        nightsLabel={nightsLabel}
        need_parking={row.need_parking}
        has_pets={row.has_pets}
        guest_requests_surprise_decor={row.guest_requests_surprise_decor}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-separator pt-3">
        <div className="min-w-0">
          <p className="text-overline">Additional fees</p>
          <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
            {formatMoney(fin.otherFees)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-overline">Host net</p>
          <p className={cn('mt-0.5 truncate text-sm font-bold tabular-nums', netClass)}>
            {formatMoney(netDisplay)}
            {!isRealized && netDisplay != null ? (
              <span className="ml-1 align-middle text-[9px] font-medium uppercase tracking-wide text-amber-600/90 dark:text-amber-400/90">
                est
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
