import { Link } from 'react-router-dom';
import { Car, ChevronRight, PartyPopper, PawPrint } from 'lucide-react';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { formatIsoDate } from '@/features/admin/lib/formatters';
import { effectiveRangeStart, STAYS_DAY_GRID_MAX_DAYS } from '@/features/dashboard/lib/dashboardStaysListView';
import type { DashboardUpcomingStay } from '@/features/dashboard/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  stays: DashboardUpcomingStay[];
  manilaDate: string;
  rangeFrom: string;
  rangeTo: string;
  showEmptyDays: boolean;
  showPreviousDates: boolean;
};

type DayGroup = {
  checkInIso: string;
  stays: DashboardUpcomingStay[];
};

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysInclusive(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

function daysUntil(checkInIso: string, todayIso: string): number {
  const a = new Date(`${checkInIso}T12:00:00`).getTime();
  const b = new Date(`${todayIso}T12:00:00`).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

function relativeShort(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tmr';
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `${days}d`;
}

function dateParts(iso: string): { month: string; day: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d),
    day: String(d.getDate()),
  };
}

function buildDayGroups(
  rangeFrom: string,
  rangeTo: string,
  stays: DashboardUpcomingStay[],
): DayGroup[] {
  const byDate = new Map<string, DashboardUpcomingStay[]>();
  for (const stay of stays) {
    const list = byDate.get(stay.checkInIso) ?? [];
    list.push(stay);
    byDate.set(stay.checkInIso, list);
  }

  const groups: DayGroup[] = [];
  let cursor = rangeFrom;
  while (cursor <= rangeTo) {
    groups.push({
      checkInIso: cursor,
      stays: byDate.get(cursor) ?? [],
    });
    cursor = addDaysIso(cursor, 1);
  }
  return groups;
}

function DatePill({
  checkInIso,
  manilaDate,
  className,
}: {
  checkInIso: string;
  manilaDate: string;
  className?: string;
}) {
  const days = daysUntil(checkInIso, manilaDate);
  const isToday = days === 0;
  const isTomorrow = days === 1;
  const { month, day } = dateParts(checkInIso);

  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center rounded-xl border px-1 py-1.5 text-center',
        isToday && 'border-rose-500/30 bg-rose-500/10',
        isTomorrow && 'border-amber-500/35 bg-amber-500/10',
        !isToday && !isTomorrow && 'border-border/60 bg-muted/40',
        className,
      )}
    >
      <span
        className={cn(
          'text-[10px] font-bold uppercase leading-none tracking-wide',
          isToday && 'text-rose-600 dark:text-rose-400',
          isTomorrow && 'text-amber-700 dark:text-amber-400',
          !isToday && !isTomorrow && 'text-muted-foreground',
        )}
      >
        {month}
      </span>
      <span
        className={cn(
          'mt-0.5 text-xl font-bold tabular-nums leading-none',
          isToday && 'text-rose-700 dark:text-rose-300',
          isTomorrow && 'text-amber-800 dark:text-amber-300',
          !isToday && !isTomorrow && 'text-foreground',
        )}
      >
        {day}
      </span>
      <span
        className={cn(
          'mt-1 text-[9px] font-semibold uppercase leading-none',
          isToday && 'text-rose-600 dark:text-rose-400',
          isTomorrow && 'text-amber-700 dark:text-amber-400',
          !isToday && !isTomorrow && 'text-muted-foreground',
        )}
      >
        {relativeShort(days)}
      </span>
    </div>
  );
}

function StayRow({
  stay,
  checkInIso,
  manilaDate,
  showDate,
}: {
  stay: DashboardUpcomingStay;
  checkInIso: string;
  manilaDate: string;
  showDate: boolean;
}) {
  return (
    <Link
      to={`/bookings/${stay.id}`}
      className={cn(
        'group grid min-h-[68px] grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 transition-colors hover:bg-muted/40 sm:min-h-[76px] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-y-0 sm:px-4',
        !showDate && 'border-t border-dashed border-border/40',
      )}
    >
      {showDate ? (
        <DatePill
          checkInIso={checkInIso}
          manilaDate={manilaDate}
          className="row-span-2 self-start sm:row-span-1 sm:self-center"
        />
      ) : (
        <div
          className="row-span-2 w-14 shrink-0 self-start sm:row-span-1 sm:self-center"
          aria-hidden
        />
      )}

      <div className="min-w-0 self-center">
        <p className="truncate text-sm font-semibold text-foreground">
          {stay.guestName}
        </p>
        <p className="mt-0.5 text-caption leading-snug sm:truncate">
          <span className="block sm:inline">
            {formatIsoDate(stay.checkInIso)} → {formatIsoDate(stay.checkOutIso)}
          </span>
          <span className="text-muted-foreground/80">
            {' '}
            · {stay.nights}n · {stay.pax} pax
          </span>
        </p>
        {(stay.needParking ||
          stay.hasPets ||
          stay.guestRequestsSurpriseDecor) && (
          <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
            {stay.needParking ? (
              <Car className="size-3.5" aria-label="Parking" />
            ) : null}
            {stay.hasPets ? (
              <PawPrint className="size-3.5" aria-label="Pets" />
            ) : null}
            {stay.guestRequestsSurpriseDecor ? (
              <PartyPopper className="size-3.5" aria-label="Surprise decor" />
            ) : null}
          </div>
        )}
      </div>

      <div className="col-start-2 flex items-center justify-end gap-1 sm:col-start-3 sm:row-start-1">
        <StatusBadge status={stay.status} className="max-w-[9.5rem]" />
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function EmptyDayRow({
  checkInIso,
  manilaDate,
}: {
  checkInIso: string;
  manilaDate: string;
}) {
  return (
    <div className="grid min-h-[56px] grid-cols-[3.5rem_1fr] items-center gap-3 px-3 py-2.5 sm:px-4">
      <DatePill checkInIso={checkInIso} manilaDate={manilaDate} />
      <p className="text-sm text-muted-foreground">No check-ins</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function DashboardUpcomingList({
  stays,
  manilaDate,
  rangeFrom,
  rangeTo,
  showEmptyDays,
  showPreviousDates,
}: Props) {
  const listStart = effectiveRangeStart(rangeFrom, manilaDate, showPreviousDates);
  const showDayGrid =
    daysInclusive(listStart, rangeTo) <= STAYS_DAY_GRID_MAX_DAYS &&
    listStart <= rangeTo;

  const visibleStays = showPreviousDates
    ? stays
    : stays.filter((stay) => stay.checkInIso >= manilaDate);

  if (!showDayGrid) {
    if (visibleStays.length === 0) {
      return (
        <EmptyState message="No stays with check-in in this view." />
      );
    }

    return (
      <ul className="divide-y divide-border/60">
        {visibleStays.map((stay) => (
          <li key={stay.id}>
            <StayRow
              stay={stay}
              checkInIso={stay.checkInIso}
              manilaDate={manilaDate}
              showDate
            />
          </li>
        ))}
      </ul>
    );
  }

  const dayGroups = buildDayGroups(listStart, rangeTo, visibleStays).filter(
    ({ stays: dayStays }) => showEmptyDays || dayStays.length > 0,
  );

  if (dayGroups.length === 0) {
    return (
      <EmptyState message="No stays with check-in in this view." />
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {dayGroups.map(({ checkInIso, stays: dayStays }) => {
        if (dayStays.length === 0) {
          return (
            <li key={checkInIso}>
              <EmptyDayRow checkInIso={checkInIso} manilaDate={manilaDate} />
            </li>
          );
        }

        return dayStays.map((stay, index) => (
          <li key={stay.id}>
            <StayRow
              stay={stay}
              checkInIso={checkInIso}
              manilaDate={manilaDate}
              showDate={index === 0}
            />
          </li>
        ));
      })}
    </ul>
  );
}
