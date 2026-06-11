import { financeDisplayNet, hostNetToneClass } from '@/features/admin/lib/bookingFinance';
import { bookingListDisplayName } from '@/features/admin/lib/bookingListDisplay';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import { formatMoney } from '@/features/admin/lib/formatters';
import {
  CalendarDayBookingCard,
} from '@/features/admin/components/calendar/CalendarDayBookingCard';
import {
  CalendarOccupancyPill,
  OccupancyCalendarView,
} from '@/features/admin/components/calendar/OccupancyCalendarView';
import type { FinanceBookingLedgerRow } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  rows: FinanceBookingLedgerRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onOpenRow: (row: FinanceBookingLedgerRow) => void;
};

function netPillLabelClass(fin: FinanceBookingLedgerRow['financials']): string {
  return hostNetToneClass(financeDisplayNet(fin), fin.isCompleted);
}

export function FinanceStaysCalendarView({
  rows,
  isLoading,
  error,
  isRefreshing,
  initialMonth,
  onMonthChange,
  onOpenRow,
}: Props) {
  return (
    <OccupancyCalendarView
      rows={rows}
      isLoading={isLoading}
      error={error}
      isRefreshing={isRefreshing}
      getItemKey={(row) => row.id}
      getItemStatus={(row) => row.status}
      renderPill={(row) => {
        const fin = row.financials;
        const netDisplay = financeDisplayNet(fin);
        const guestName = bookingListDisplayName(row);
        const label =
          netDisplay == null
            ? '—'
            : `${formatMoney(netDisplay)}${!fin.isCompleted ? ' est' : ''}`;

        return (
          <CalendarOccupancyPill
            status={row.status}
            label={label}
            title={`${guestName} · ${formatMoney(netDisplay)} host net · ${statusLabel(row.status)}`}
            labelClassName={cn('tabular-nums', netPillLabelClass(fin))}
          />
        );
      }}
      renderDayItem={(row) => {
        const fin = row.financials;
        const netDisplay = financeDisplayNet(fin);
        return (
          <CalendarDayBookingCard
            row={row}
            amount={{
              mode: 'host_net',
              amount: netDisplay,
              isRealized: fin.isCompleted,
            }}
            onOpen={() => onOpenRow(row)}
          />
        );
      }}
      entityLabel="stays"
      entityLabelSingular="stay"
      initialMonth={initialMonth}
      onMonthChange={onMonthChange}
      emptySelectCaption="Click any day to see stays with a guest that night"
      emptyDayCaption="No stays are scheduled for this night"
    />
  );
}
