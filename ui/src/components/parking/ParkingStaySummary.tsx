import { CalendarDays, Moon } from 'lucide-react';

import { countParkingStayNights, formatParkingStayRange } from '@/utils/format/parkingStayDisplay';

import { cn } from '@/lib/utils';

type Props = {
  checkIn: string;
  checkOut: string;
  organizationName?: string | null;
  className?: string;
  compact?: boolean;
};

export function ParkingStaySummary({
  checkIn,
  checkOut,
  organizationName,
  className,
  compact = false,
}: Props) {
  const rangeLabel = formatParkingStayRange(checkIn, checkOut);
  const nights = countParkingStayNights(checkIn, checkOut);

  if (!rangeLabel) return null;

  return (
    <div
      className={cn(
        'border-border/80 bg-muted/30 flex gap-3 rounded-xl border p-4',
        compact ? 'p-3' : 'sm:p-5',
        className
      )}
    >
      <div
        className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        aria-hidden
      >
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-foreground text-sm font-semibold tracking-tight sm:text-base">
          {rangeLabel}
        </p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm">
          {nights != null && nights > 0 && (
            <span className="inline-flex items-center gap-1">
              <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          )}
          {organizationName && <span className="truncate">{organizationName}</span>}
        </div>
      </div>
    </div>
  );
}
