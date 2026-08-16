import { useMemo, useRef, useState } from 'react';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CalendarDays, Search } from 'lucide-react';

import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { useBookings } from '@/features/dashboard/bookings/hooks/useBookings';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import { DEFAULT_BOOKINGS_QUERY, type BookingRow } from '@/features/dashboard/bookings/lib/types';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { formatBookingDateShort } from '@/utils/format/bookingDisplay';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

dayjs.extend(customParseFormat);

export type PinnedBooking = {
  id: string;
  propertyId: string | null;
  label: string;
};

type MonthGroup = {
  key: string;
  label: string;
  rows: BookingRow[];
};

type Props = {
  value: PinnedBooking | null;
  onChange: (booking: PinnedBooking | null) => void;
  pageBookingId?: string | null;
  disabled?: boolean;
  overlayContainer?: HTMLElement | null;
};

function guestName(row: BookingRow): string {
  return row.primary_guest_name || row.guest_facebook_name || 'Guest';
}

function stayRange(row: BookingRow): string {
  return `${formatBookingDateShort(row.check_in_date)}–${formatBookingDateShort(row.check_out_date)}`;
}

export function bookingRowLabel(row: BookingRow): string {
  return `${guestName(row)} · ${stayRange(row)}`;
}

function parseCheckIn(raw: string | null | undefined) {
  if (!raw) return null;
  const mmdd = dayjs(raw, 'MM-DD-YYYY', true);
  if (mmdd.isValid()) return mmdd;
  const iso = dayjs(raw.slice(0, 10), 'YYYY-MM-DD', true);
  return iso.isValid() ? iso : null;
}

function bookingSearchHaystack(row: BookingRow): string {
  return [
    guestName(row),
    stayRange(row),
    formatBookingDateShort(row.check_in_date),
    row.property_name,
    statusLabel(row.status),
    row.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function groupByCheckInMonth(rows: BookingRow[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  const unknown: BookingRow[] = [];

  for (const row of rows) {
    const checkIn = parseCheckIn(row.check_in_date);
    if (!checkIn) {
      unknown.push(row);
      continue;
    }
    const key = checkIn.format('YYYY-MM');
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(key, { key, label: checkIn.format('MMMM YYYY'), rows: [row] });
    }
  }

  const groups = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  if (unknown.length > 0) {
    groups.push({ key: 'unknown', label: 'No date', rows: unknown });
  }
  return groups;
}

function BookingPickerRow({
  row,
  selected,
  hint,
  onSelect,
}: {
  row: BookingRow;
  selected: boolean;
  hint?: string;
  onSelect: (row: BookingRow) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(row)}
      className={cn(
        'native-press focus-visible:ring-ring flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 py-2 text-left',
        'focus-visible:outline-none focus-visible:ring-2',
        selected ? 'bg-primary/10' : 'hover:bg-muted/60'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-medium">{guestName(row)}</span>
        <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-xs">
          <CalendarDays className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{stayRange(row)}</span>
          {hint ? <span className="text-primary shrink-0 font-medium">{hint}</span> : null}
        </span>
      </span>
      <StatusBadge
        status={row.status}
        className="max-w-[8.5rem] shrink-0 px-1.5 py-0 text-[10px] font-semibold"
      />
    </button>
  );
}

export function ChatComposerBookingPicker({
  value,
  onChange,
  pageBookingId,
  disabled,
  overlayContainer,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const propertyId = usePropertyIdParam();
  const { data, isLoading } = useBookings(
    {
      ...DEFAULT_BOOKINGS_QUERY,
      bookingKind: 'property',
      sort: 'check_in_date:asc',
      limit: 80,
    },
    { scope: propertyId ? 'property' : 'org' }
  );

  const rows = data?.rows ?? [];
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return rows;
    return rows.filter((row) => bookingSearchHaystack(row).includes(needle));
  }, [rows, needle]);

  const pageRow =
    !needle && pageBookingId ? rows.find((row) => row.id === pageBookingId) : undefined;
  const grouped = useMemo(() => {
    const rest = pageRow ? filtered.filter((row) => row.id !== pageRow.id) : filtered;
    return groupByCheckInMonth(rest);
  }, [filtered, pageRow]);

  const selectRow = (row: BookingRow) => {
    onChange({
      id: row.id,
      propertyId: row.property_id ?? null,
      label: bookingRowLabel(row),
    });
    setOpen(false);
    setQ('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQ('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Pin a booking"
          aria-pressed={Boolean(value)}
          className={cn('min-h-[44px] min-w-[44px] shrink-0', value ? 'text-primary' : undefined)}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        container={overlayContainer}
        className="w-[min(calc(100vw-2rem),24rem)] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="border-border/60 relative border-b p-2">
          <Search
            className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Guest, date, or status"
            aria-label="Search bookings"
            className="h-10 ps-9"
          />
        </div>

        <div
          role="listbox"
          aria-label="Bookings"
          className="max-h-72 touch-pan-y overflow-y-auto overscroll-contain p-1.5 [-webkit-overflow-scrolling:touch]"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {isLoading ? (
            <div className="space-y-1 p-1" aria-busy="true">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">No bookings</p>
          ) : (
            <>
              {pageRow ? (
                <BookingPickerRow
                  row={pageRow}
                  selected={value?.id === pageRow.id}
                  hint="This page"
                  onSelect={selectRow}
                />
              ) : null}
              {grouped.map((group) => (
                <section key={group.key} className="mt-1 first:mt-0">
                  <h3 className="text-muted-foreground bg-popover sticky top-0 z-[1] px-2 py-1.5 text-xs font-medium">
                    {group.label}
                  </h3>
                  <ul>
                    {group.rows.map((row) => (
                      <li key={row.id}>
                        <BookingPickerRow
                          row={row}
                          selected={value?.id === row.id}
                          onSelect={selectRow}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
