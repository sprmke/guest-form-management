import type { BookingKind, BookingRow } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';

export function isParkingBooking(row: Pick<BookingRow, 'booking_kind' | 'parking_id'>): boolean {
  return row.booking_kind === 'parking' || Boolean(row.parking_id);
}

export function bookingResourceName(row: BookingRow): string | null {
  if (isParkingBooking(row)) {
    return row.parking_name?.trim() || null;
  }
  return row.property_name?.trim() || null;
}

type Props = {
  row: Pick<BookingRow, 'booking_kind' | 'parking_id' | 'property_name' | 'parking_name'>;
  /** Org list: show Property / Parking badge. */
  showKindBadge?: boolean;
  className?: string;
};

/** Property or parking name for org-scoped booking list views. */
export function BookingResourceLabel({ row, showKindBadge = false, className }: Props) {
  const name = bookingResourceName(row as BookingRow);
  if (!name) return null;

  const kind: BookingKind = isParkingBooking(row) ? 'parking' : 'property';

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      {showKindBadge ? (
        <span
          className={cn(
            'shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            kind === 'parking'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'bg-primary/10 text-primary'
          )}
        >
          {kind === 'parking' ? 'Parking' : 'Property'}
        </span>
      ) : null}
      <p className="text-caption text-muted-foreground truncate" title={name}>
        {name}
      </p>
    </div>
  );
}

/** @deprecated Use BookingResourceLabel */
export function BookingPropertyLabel({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name?.trim()) return null;
  return (
    <p className={cn('text-caption text-muted-foreground truncate', className)} title={name}>
      {name}
    </p>
  );
}
