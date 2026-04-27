import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  type DateNavigationState,
  type DatePreset,
  formatDateRangeDisplay,
  isCurrentPeriod,
} from '@/lib/dateNavigation';

type Props = DateNavigationState & {
  /** Whether a date range is currently applied to the booking query. */
  isActive: boolean;
  /** Clear the date filter (sets `from`/`to` to null in URL state). */
  onClear: () => void;
};

const PRESET_OPTIONS: {
  value: DatePreset;
  label: string;
  description: string;
}[] = [
  { value: 'week', label: 'Week', description: 'This week (Sun-Sat)' },
  { value: 'month', label: 'Month', description: 'This calendar month' },
  { value: 'year', label: 'Year', description: 'This calendar year' },
  { value: 'custom', label: 'Custom range', description: 'Pick any range' },
];

/**
 * Date range filter — reuses the UX of property-management-app's
 * `DateRangeSelector` (presets + ←/→ navigation + custom calendar) but
 * styled with the same `FilterBtn` / `DropdownPanel` look as the rest of
 * BookingFilters.tsx so it visually fits this app's design language.
 *
 * Layout differs between modes:
 * - Preset modes (week/month/year): trigger button shows the formatted range,
 *   and is flanked by ← / → buttons that call `navigatePeriod`.
 * - Custom mode: trigger button opens a 2-month calendar to pick start/end.
 */
export function BookingDateRangeFilter({
  dateRange,
  datePreset,
  setDatePreset,
  setDateRange,
  navigatePeriod,
  goToToday,
  isActive,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DayPickerDateRange | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const isCurrent = isCurrentPeriod(dateRange.from, datePreset);
  const canNavigate = datePreset !== 'custom' && isActive;
  const isCustomMode = datePreset === 'custom';

  useEffect(() => {
    if (calendarOpen) {
      setLocalRange({ from: dateRange.from, to: dateRange.to });
    }
  }, [calendarOpen, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!open && !calendarOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setCalendarOpen(false);
      }
    };
    const t = setTimeout(
      () => document.addEventListener('mousedown', handler),
      80,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, calendarOpen]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setOpen(false);
      setCalendarOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleApplyRange = () => {
    if (localRange?.from && localRange?.to) {
      setDateRange({ from: localRange.from, to: localRange.to });
      setCalendarOpen(false);
    }
  };

  const triggerLabel = isActive
    ? formatDateRangeDisplay(dateRange.from, dateRange.to, datePreset)
    : 'Date';

  return (
    <div ref={containerRef} className="flex items-center gap-1 shrink-0">
      {/* ← Prev period (preset modes only) */}
      {canNavigate && (
        <button
          type="button"
          onClick={() => navigatePeriod('prev')}
          aria-label="Previous period"
          className={cn(
            'inline-flex items-center justify-center rounded-lg min-w-[36px] min-h-[44px]',
            'border bg-white text-sidebar-muted border-sidebar-border',
            'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
            'transition-all duration-100',
          )}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
      )}

      {/* Trigger button + popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            isCustomMode && isActive
              ? setCalendarOpen((v) => !v)
              : setOpen((v) => !v)
          }
          aria-expanded={open || calendarOpen}
          aria-haspopup="dialog"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold',
            'border transition-all duration-100 whitespace-nowrap select-none min-h-[44px]',
            isActive || open || calendarOpen
              ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
              : 'bg-white text-sidebar-foreground border-sidebar-border hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
          )}
        >
          <CalendarDays
            className={cn(
              'size-3.5 shrink-0',
              isActive || open || calendarOpen
                ? 'text-sidebar-primary-foreground/90'
                : 'text-slate-400',
            )}
            aria-hidden
          />
          <span className="max-w-[180px] truncate">{triggerLabel}</span>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-150',
              (open || calendarOpen) && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {/* Preset dropdown */}
        {open && (
          <div
            className={cn(
              'absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl overflow-hidden w-72',
              'max-w-[calc(100vw-24px)]',
            )}
            style={{
              border: '1px solid rgba(0,0,0,0.09)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2.5"
              style={{ borderBottom: '1px solid #f1f5f9' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                View by
              </span>
              {isActive && !isCurrent && datePreset !== 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    goToToday();
                    setOpen(false);
                  }}
                  className="text-[12px] font-semibold text-sidebar-primary hover:opacity-80 transition-opacity"
                >
                  Today
                </button>
              )}
            </div>
            <div className="py-1">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = opt.value === datePreset && isActive;
                const Icon =
                  opt.value === 'custom' ? CalendarDays : CalendarIcon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePresetChange(opt.value)}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3.5 py-2 text-left transition-colors',
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-3.5 shrink-0',
                        isSelected ? 'text-sidebar-primary' : 'text-slate-300',
                      )}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[13px] leading-tight',
                          isSelected
                            ? 'font-semibold text-slate-800'
                            : 'font-medium text-slate-600',
                        )}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-[2px] text-[11px] text-slate-400 leading-tight">
                        {opt.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check
                        className="ml-auto size-3.5 text-sidebar-primary shrink-0"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {isActive && (
              <div
                className="px-3.5 py-2 flex justify-end"
                style={{ borderTop: '1px solid #f1f5f9' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Clear date filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom range calendar popover */}
        {calendarOpen && (
          <div
            className={cn(
              'absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl overflow-hidden',
              'max-w-[calc(100vw-24px)]',
            )}
            style={{
              border: '1px solid rgba(0,0,0,0.09)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="flex items-center justify-between gap-4 px-3.5 py-2.5"
              style={{ borderBottom: '1px solid #f1f5f9' }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select date range
              </span>
              <button
                type="button"
                onClick={() => {
                  setDatePreset('month');
                  setCalendarOpen(false);
                }}
                className="text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Back to presets
              </button>
            </div>
            <div className="p-2 sm:p-3">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={localRange}
                onSelect={setLocalRange}
                numberOfMonths={
                  typeof window !== 'undefined' && window.innerWidth >= 768
                    ? 2
                    : 1
                }
                weekStartsOn={0}
                classNames={CALENDAR_CLASSNAMES}
              />
            </div>
            <div
              className="flex items-center justify-between gap-2 px-3.5 py-2.5"
              style={{ borderTop: '1px solid #f1f5f9' }}
            >
              <div className="text-[12px] text-slate-500 min-w-0">
                {localRange?.from ? (
                  <>
                    <span className="font-semibold text-slate-700">
                      {format(localRange.from, 'MMM d, yyyy')}
                    </span>
                    {localRange.to ? (
                      <>
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="font-semibold text-slate-700">
                          {format(localRange.to, 'MMM d, yyyy')}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400"> · select end date</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">Select start date</span>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className={cn(
                    'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-semibold',
                    'border bg-white text-sidebar-muted border-sidebar-border',
                    'hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50 transition-all duration-100',
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyRange}
                  disabled={!localRange?.from || !localRange?.to}
                  className={cn(
                    'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white',
                    'transition-all duration-100',
                    'disabled:opacity-40 disabled:pointer-events-none',
                    'hover:opacity-90 active:scale-[0.98]',
                  )}
                  style={{
                    background: 'hsl(var(--sidebar-primary))',
                    boxShadow: '0 1px 3px hsl(var(--sidebar-primary) / 0.35)',
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* → Next period (preset modes only) */}
      {canNavigate && (
        <button
          type="button"
          onClick={() => navigatePeriod('next')}
          aria-label="Next period"
          className={cn(
            'inline-flex items-center justify-center rounded-lg min-w-[36px] min-h-[44px]',
            'border bg-white text-sidebar-muted border-sidebar-border',
            'hover:border-sidebar-primary/40 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50',
            'transition-all duration-100',
          )}
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Tailwind classes for `react-day-picker` v9 styled to match this app. */
const CALENDAR_CLASSNAMES = {
  months: 'flex flex-col sm:flex-row gap-4',
  month: 'space-y-2',
  month_caption: 'flex justify-center pt-1 relative items-center h-8',
  caption_label: 'text-[13px] font-bold text-slate-700',
  nav: 'space-x-1 flex items-center',
  button_previous: cn(
    'absolute left-1 inline-flex items-center justify-center rounded-md size-7 p-0',
    'border border-sidebar-border bg-white text-slate-500',
    'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
    'transition-colors duration-100',
  ),
  button_next: cn(
    'absolute right-1 inline-flex items-center justify-center rounded-md size-7 p-0',
    'border border-sidebar-border bg-white text-slate-500',
    'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
    'transition-colors duration-100',
  ),
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday:
    'text-slate-400 rounded-md w-9 font-semibold text-[10px] uppercase tracking-wider',
  week: 'flex w-full mt-1',
  day: cn(
    'size-9 text-center text-[12px] font-medium p-0 relative',
    '[&:has([aria-selected].day-range-end)]:rounded-r-md',
    '[&:has([aria-selected])]:bg-sidebar-accent/40',
    'first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
    'focus-within:relative focus-within:z-20',
  ),
  day_button: cn(
    'inline-flex items-center justify-center rounded-md size-9 p-0 text-[12px] font-medium',
    'text-slate-700 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
    'aria-selected:opacity-100 transition-colors duration-100',
  ),
  range_start: 'day-range-start',
  range_end: 'day-range-end',
  selected: cn(
    'text-sidebar-primary-foreground',
    '[&_button]:bg-sidebar-primary [&_button]:text-sidebar-primary-foreground',
    '[&_button:hover]:bg-sidebar-primary [&_button:hover]:text-sidebar-primary-foreground',
  ),
  today: 'font-bold [&_button]:ring-2 [&_button]:ring-sidebar-primary/40',
  outside:
    'day-outside text-slate-300 aria-selected:bg-sidebar-accent/30 aria-selected:text-slate-400',
  disabled: 'text-slate-300 opacity-50 pointer-events-none',
  range_middle:
    'aria-selected:bg-sidebar-accent/60 aria-selected:text-sidebar-accent-foreground',
  hidden: 'invisible',
};
