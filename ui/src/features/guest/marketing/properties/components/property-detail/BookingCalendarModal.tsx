import { CalendarDays, ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { PublicPropertyCalendar } from './PublicPropertyCalendar';

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatDisplayDate(d: Date): string {
  const month = MONTH_NAMES[d.getMonth()]?.slice(0, 3) ?? '';
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertySlug: string;
  propertyName?: string;
  checkIn: Date | null;
  checkOut: Date | null;
  onDatesChange: (checkIn: Date | null, checkOut: Date | null) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BookingCalendarModal({
  open,
  onOpenChange,
  propertySlug,
  propertyName = '',
  checkIn,
  checkOut,
  onDatesChange,
}: BookingCalendarModalProps) {
  const nightsCount =
    checkIn && checkOut
      ? Math.round(
          (toMidnight(checkOut).getTime() - toMidnight(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const hasRange = checkIn !== null && checkOut !== null;
  const hasCheckIn = checkIn !== null;

  // Step-based title: a single, clear instruction that doubles as status
  const stepTitle = hasRange
    ? `${nightsCount} night${nightsCount !== 1 ? 's' : ''} selected`
    : hasCheckIn
      ? 'Now select check-out date'
      : 'Select check-in date';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[580px]"
        aria-describedby={undefined}
      >
        {/* ── Header ─ single line, step-based instruction ─────────────────── */}
        <div className="border-border flex items-center gap-3 border-b pb-4 pr-5">
          <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            {hasRange ? (
              <Check className="text-primary h-3.5 w-3.5" />
            ) : (
              <CalendarDays className="text-primary h-3.5 w-3.5" />
            )}
          </div>
          <DialogTitle
            className={cn('text-base font-semibold', hasRange ? 'text-primary' : 'text-foreground')}
          >
            {stepTitle}
          </DialogTitle>
        </div>

        {/* ── Calendar (compact = no internal date summary) ─────────────────── */}
        <div className="flex-1 p-5">
          <PublicPropertyCalendar
            propertyName={propertyName}
            propertySlug={propertySlug}
            value={{ checkIn, checkOut }}
            onDatesChange={onDatesChange}
            showBookingAction={false}
            compact={true}
          />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="border-border flex items-center justify-between gap-3 border-t pt-4">
          <button
            onClick={() => onDatesChange(null, null)}
            disabled={!hasCheckIn}
            className={cn(
              'text-sm underline-offset-2 transition-colors',
              hasCheckIn
                ? 'text-muted-foreground hover:text-foreground cursor-pointer underline'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
            aria-label="Clear date selection"
          >
            Clear dates
          </button>

          <Button
            onClick={() => onOpenChange(false)}
            disabled={!hasRange}
            className="rounded-full px-6"
          >
            {hasRange ? (
              <span className="flex items-center gap-1.5">
                Save dates
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              'Select dates'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component: DatePill ──────────────────────────────────────────────────

interface DatePillProps {
  label: string;
  date: Date | null;
  isActive: boolean;
}

function DatePill({ label, date, isActive }: DatePillProps) {
  return (
    <div className={cn('bg-card px-3 py-2.5 transition-colors', isActive && 'bg-primary/10')}>
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-medium',
          date ? 'text-foreground' : 'text-muted-foreground/50'
        )}
      >
        {date ? formatDisplayDate(date) : 'Add date'}
      </p>
    </div>
  );
}
