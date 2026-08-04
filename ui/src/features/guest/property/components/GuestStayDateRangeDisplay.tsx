import { differenceInDays, format } from 'date-fns';
import { ArrowRight, CalendarRange, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GuestStayDateRangeDisplayProps = {
  checkIn: Date;
  checkOut?: Date | null;
  checkInDetail?: string | null;
  checkOutDetail?: string | null;
  onClear?: () => void;
  /** Property-detail calendar uses a green accent when dates are custom-picked. */
  tone?: 'brand' | 'success';
  /** `constrained` centers at 75% on sm+ (header/context). `full` spans the parent width. */
  width?: 'constrained' | 'full';
  className?: string;
};

function formatStayDate(date: Date, compact = false): string {
  return format(date, compact ? 'MMM d' : 'MMM d, yyyy');
}

/** Shared selected stay range — check-in/out columns, nights pill, optional clear. */
export function GuestStayDateRangeDisplay({
  checkIn,
  checkOut,
  checkInDetail,
  checkOutDetail,
  onClear,
  tone = 'brand',
  width = 'constrained',
  className,
}: GuestStayDateRangeDisplayProps) {
  const nights = checkOut && checkOut > checkIn ? differenceInDays(checkOut, checkIn) : 0;
  const isSuccess = tone === 'success';

  const accentText = isSuccess ? 'text-emerald-600' : 'text-primary';
  const labelClass = cn(
    'text-overline mb-0.5 whitespace-nowrap',
    isSuccess ? 'text-emerald-700/80 dark:text-emerald-400/90' : 'text-primary/80'
  );

  const nightsPillClass = cn(
    'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none sm:px-3 sm:py-1 sm:text-xs',
    isSuccess ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-sm sm:rounded-2xl',
        width === 'full' ? 'w-full' : 'mx-auto w-full sm:w-3/4',
        isSuccess
          ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent'
          : 'border-primary/15 from-primary/[0.09] via-primary/[0.04] bg-gradient-to-br to-transparent',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          isSuccess ? 'bg-emerald-500/50' : 'bg-primary/45'
        )}
        aria-hidden
      />

      {/* Mobile — one compact row */}
      <div
        className="flex min-h-[44px] items-center gap-1.5 py-2 pl-3 pr-2 sm:hidden"
        aria-label={
          checkOut
            ? `Stay ${formatStayDate(checkIn, true)} to ${formatStayDate(checkOut, true)}`
            : `Check-in ${formatStayDate(checkIn, true)}`
        }
      >
        <CalendarRange className={cn('size-4 shrink-0', accentText)} aria-hidden />
        <p className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {formatStayDate(checkIn, true)}
          <ArrowRight
            className={cn(
              'mx-1 inline size-3.5 align-[-2px]',
              isSuccess ? 'text-emerald-600/50' : 'text-primary/45'
            )}
            aria-hidden
          />
          {checkOut ? formatStayDate(checkOut, true) : 'Select date'}
        </p>
        {nights > 0 ? (
          <span className={nightsPillClass}>
            {nights} night{nights === 1 ? '' : 's'}
          </span>
        ) : null}
        {onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'size-9 shrink-0 p-0',
              isSuccess
                ? 'text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={onClear}
            aria-label="Clear dates"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {/* sm+ — labeled columns */}
      <div className="hidden items-center gap-3 py-3.5 pl-5 pr-4 sm:flex">
        <div
          className={cn(
            'icon-well-sm inline-flex shrink-0 items-center justify-center border',
            isSuccess
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-primary/15 bg-primary/10'
          )}
        >
          <CalendarRange className={cn('size-5', accentText)} aria-hidden />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3">
          <div className="min-w-0">
            <p className={labelClass}>Check-in</p>
            <p className="text-foreground text-[15px] font-semibold">{formatStayDate(checkIn)}</p>
            {checkInDetail ? (
              <p className="text-muted-foreground truncate text-xs">{checkInDetail}</p>
            ) : null}
          </div>

          <ArrowRight
            className={cn('size-4 shrink-0', isSuccess ? 'text-emerald-600/50' : 'text-primary/45')}
            aria-hidden
          />

          <div className="min-w-0">
            <p className={labelClass}>Check-out</p>
            {checkOut ? (
              <>
                <p className="text-foreground text-[15px] font-semibold">
                  {formatStayDate(checkOut)}
                </p>
                {checkOutDetail ? (
                  <p className="text-muted-foreground truncate text-xs">{checkOutDetail}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-sm font-medium">Select date</p>
            )}
          </div>
        </div>

        {nights > 0 ? (
          <span className={nightsPillClass}>
            {nights} night{nights === 1 ? '' : 's'}
          </span>
        ) : null}

        {onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'min-h-[36px] min-w-[36px] shrink-0',
              isSuccess
                ? 'text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={onClear}
            aria-label="Clear dates"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
