import type { ReactNode } from 'react';

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfToday,
  getDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, PenLine, Sparkles } from 'lucide-react';

import type { PricingHolidayRule } from '@/features/dashboard/pricing/lib/phHolidayRules';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/utils/format/currency';

export type PricingDayState = {
  price: number;
  rule?: PricingHolidayRule;
  isCustom: boolean;
  isBooked: boolean;
};

type Props = {
  currentMonth: Date;
  selectedDates: Date[];
  onMonthChange: (month: Date) => void;
  onDateClick: (date: Date) => void;
  onDateMouseDown: (date: Date) => void;
  onDateMouseEnter: (date: Date) => void;
  onSelectionEnd: () => void;
  getPriceForDate: (date: Date) => PricingDayState;
};

export function PricingCalendarGrid({
  currentMonth,
  selectedDates,
  onMonthChange,
  onDateClick,
  onDateMouseDown,
  onDateMouseEnter,
  onSelectionEnd,
  getPriceForDate,
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddedDays = Array.from({ length: startPadding }, (_, i) => i);

  return (
    <section className="surface-card min-w-0 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-base font-semibold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            Select dates to override the nightly rate
          </p>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Previous month"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9.5rem] text-center text-base font-semibold tabular-nums">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        <LegendSwatch className="bg-card ring-border ring-1" label="Available" />
        <LegendIcon label="Holiday">
          <Sparkles className="text-primary size-3" aria-hidden />
        </LegendIcon>
        <LegendIcon label="Custom">
          <PenLine className="size-3 text-amber-600 dark:text-amber-400" aria-hidden />
        </LegendIcon>
        <LegendStrikethrough label="Booked" />
        <LegendSwatch className="ring-primary ring-1" label="Selected" />
      </div>

      <TooltipProvider delayDuration={200}>
        <div
          className="mt-4 select-none"
          onMouseUp={onSelectionEnd}
          onMouseLeave={onSelectionEnd}
          onTouchEnd={onSelectionEnd}
        >
          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-muted-foreground py-1 text-center text-xs font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {paddedDays.map((index) => (
              <div key={`pad-${index}`} className="aspect-square" aria-hidden />
            ))}
            {daysInMonth.map((day) => {
              const { price, rule, isCustom, isBooked } = getPriceForDate(day);
              const isSelected = selectedDates.some((d) => isSameDay(d, day));
              const isPast = isBefore(day, startOfToday());
              const hasHoliday = rule != null;
              const isUnavailable = isPast || isBooked;

              return (
                <Tooltip key={day.toISOString()}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'border-border bg-card relative flex aspect-square min-w-0 flex-col rounded-lg border p-1.5 text-left transition-colors sm:p-2',
                        isUnavailable && 'cursor-not-allowed opacity-45',
                        !isUnavailable && 'hover:border-primary/50 cursor-pointer hover:shadow-sm',
                        isSelected &&
                          !isUnavailable &&
                          'border-primary bg-primary/10 ring-primary/30 opacity-100 ring-2',
                        isToday(day) && !isSelected && !isUnavailable && 'ring-primary/60 ring-1'
                      )}
                      onMouseDown={() => {
                        if (!isBooked) onDateMouseDown(day);
                      }}
                      onMouseEnter={() => {
                        if (!isBooked) onDateMouseEnter(day);
                      }}
                      onClick={() => {
                        if (!isBooked) onDateClick(day);
                      }}
                      disabled={isUnavailable}
                      aria-pressed={isSelected}
                      aria-disabled={isBooked}
                      aria-label={`${format(day, 'MMMM d')}, ${formatMoneyCompact(price)} per night${isBooked ? ', booked' : ''}${hasHoliday ? ', holiday' : ''}${isCustom ? ', custom rate' : ''}`}
                    >
                      <>
                        <span
                          className={cn(
                            'text-sm font-semibold leading-none',
                            isBooked &&
                              'text-muted-foreground decoration-muted-foreground/80 line-through',
                            !isBooked && isToday(day) && !isUnavailable && 'text-primary',
                            !isBooked && (!isToday(day) || isUnavailable) && 'text-foreground'
                          )}
                        >
                          {format(day, 'd')}
                        </span>

                        <div className="bg-muted/70 dark:bg-muted/50 mt-auto flex w-full items-center justify-center rounded-md px-0.5 py-1">
                          <span
                            className={cn(
                              'w-full truncate text-center text-[11px] font-semibold tabular-nums leading-none sm:text-xs',
                              isUnavailable ? 'text-muted-foreground' : 'text-foreground'
                            )}
                          >
                            {formatMoneyCompact(price)}
                          </span>
                        </div>
                      </>

                      {isCustom && !isBooked ? (
                        <PenLine
                          className="absolute right-1 top-1 size-3 text-amber-600 dark:text-amber-400"
                          aria-hidden
                        />
                      ) : null}
                      {hasHoliday && !isBooked ? (
                        <Sparkles
                          className="text-primary absolute right-1 top-1 size-3"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-3 py-2.5">
                    <PricingDayTooltip
                      day={day}
                      price={price}
                      isBooked={isBooked}
                      isPast={isPast}
                      rule={hasHoliday ? rule : undefined}
                      isCustom={isCustom}
                    />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    </section>
  );
}

function PricingDayTooltip({
  day,
  price,
  isBooked,
  isPast,
  rule,
  isCustom,
}: {
  day: Date;
  price: number;
  isBooked: boolean;
  isPast: boolean;
  rule?: PricingHolidayRule;
  isCustom: boolean;
}) {
  const tags: string[] = [];
  if (isBooked) tags.push('Booked');
  else if (isPast) tags.push('Past');
  if (rule) tags.push(rule.name);
  if (isCustom) tags.push('Custom rate');

  return (
    <div className="min-w-[8.75rem] space-y-2">
      <p className="text-muted-foreground text-xs font-medium leading-none">
        {format(day, 'EEEE, MMM d')}
      </p>
      <p className="text-foreground text-base font-semibold tabular-nums leading-none">
        {formatMoneyCompact(price)}
        <span className="text-muted-foreground ml-1 text-xs font-normal">/ night</span>
      </p>
      {tags.length > 0 ? (
        <div className="border-border/60 flex flex-wrap gap-1 border-t pt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted/80 text-muted-foreground inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LegendStrikethrough({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground decoration-muted-foreground/80 text-xs font-semibold leading-none line-through">
        20
      </span>
      {label}
    </span>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-[3px]', className)} />
      {label}
    </span>
  );
}

function LegendIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex size-4 items-center justify-center">{children}</span>
      {label}
    </span>
  );
}
