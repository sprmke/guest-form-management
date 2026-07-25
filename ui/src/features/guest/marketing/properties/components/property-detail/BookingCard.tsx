import { useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import {
  CalendarDays,
  Users,
  Star,
  ChevronDown,
  Info,
  Shield,
  Check,
  ChevronRight,
} from 'lucide-react';

import { useParkingReserve } from '@/features/guest/marketing/parkings/hooks/useParkingReserve';
import { usePropertyReserve } from '@/features/guest/marketing/properties/hooks/usePropertyReserve';

import { computeParkingStayTotal } from '@/features/dashboard/parking/lib/parkingPricingCompute';
import { parkingPricingDefaultsFromDto } from '@/features/dashboard/parking/lib/parkingPricingDefaults';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BookingCalendarModal } from './BookingCalendarModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDateDisplay(d: Date): string {
  const month = MONTH_NAMES[d.getMonth()]?.slice(0, 3) ?? '';
  return `${month} ${d.getDate()}`;
}

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BookingCardProps {
  baseRate: number;
  currency?: string;
  cleaningFee?: number | null;
  securityDeposit?: number | null;
  parkingRate?: number | null;
  petFee?: number | null;
  taxRate?: number;
  rating?: number;
  reviews?: number;
  maxGuests?: number | null;
  /** Slug used for the calendar's booking URL */
  propertySlug?: string;
  propertyName?: string;
  /** Property vs parking — adjusts copy, fees, and reserve target. */
  listingKind?: 'property' | 'parking';
  listingSlug?: string;
  listingName?: string;
  weekendNightlyRate?: number;
  dateOverrides?: Record<string, number>;
  onReserve?: () => void;
  /** Controlled dates — when provided the parent owns the state */
  checkIn?: Date | null;
  checkOut?: Date | null;
  onDatesChange?: (checkIn: Date | null, checkOut: Date | null) => void;
  calendarOpen?: boolean;
  onCalendarOpenChange?: (open: boolean) => void;
  cancellationShortLabel?: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BookingCard({
  baseRate,
  currency = 'PHP',
  cleaningFee = 500,
  securityDeposit = 2000,
  parkingRate: _parkingRate,
  petFee: _petFee,
  taxRate = 0.12,
  rating = 4.9,
  reviews = 127,
  maxGuests = 6,
  propertySlug = '',
  propertyName = '',
  listingKind = 'property',
  listingSlug,
  listingName,
  weekendNightlyRate,
  dateOverrides,
  onReserve: onReserveOverride,
  checkIn: externalCheckIn,
  checkOut: externalCheckOut,
  onDatesChange,
  calendarOpen: externalCalendarOpen,
  onCalendarOpenChange,
  cancellationShortLabel,
}: BookingCardProps) {
  // Internal state — used when parent doesn't control dates
  const [internalCheckIn, setInternalCheckIn] = useState<Date | null>(null);
  const [internalCheckOut, setInternalCheckOut] = useState<Date | null>(null);

  const isControlled = externalCheckIn !== undefined;
  const checkIn = isControlled ? (externalCheckIn ?? null) : internalCheckIn;
  const checkOut = isControlled ? (externalCheckOut ?? null) : internalCheckOut;

  const handleDatesChange = (ci: Date | null, co: Date | null) => {
    if (isControlled) {
      onDatesChange?.(ci, co);
    } else {
      setInternalCheckIn(ci);
      setInternalCheckOut(co);
    }
  };

  const [internalCalendarOpen, setInternalCalendarOpen] = useState(false);
  const calendarControlled = externalCalendarOpen !== undefined;
  const calendarOpen = calendarControlled ? (externalCalendarOpen ?? false) : internalCalendarOpen;
  const setCalendarOpen = (open: boolean) => {
    if (calendarControlled) {
      onCalendarOpenChange?.(open);
    } else {
      setInternalCalendarOpen(open);
    }
  };

  const [guests, setGuests] = useState(2);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  const isParking = listingKind === 'parking';
  const resolvedSlug = listingSlug ?? propertySlug;
  const resolvedName = listingName ?? propertyName;

  const propertyReserve = usePropertyReserve({
    propertySlug: resolvedSlug,
    checkIn,
    checkOut,
    onNeedDates: () => setCalendarOpen(true),
  });

  const parkingReserve = useParkingReserve({
    parkingSlug: resolvedSlug,
    checkIn,
    checkOut,
    onNeedDates: () => setCalendarOpen(true),
  });

  const reserve =
    onReserveOverride ?? (isParking ? parkingReserve.reserve : propertyReserve.reserve);

  const showRating = !isParking && rating != null && reviews != null;
  const showGuests = !isParking;
  const showPropertyFees = !isParking;

  // ── Derived values ──────────────────────────────────────────────────────

  const nightsCount =
    checkIn && checkOut
      ? Math.round(
          (toMidnight(checkOut).getTime() - toMidnight(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);

  const hasDates = checkIn !== null && checkOut !== null;
  const hasCheckIn = checkIn !== null;

  const staySubtotal = useMemo(() => {
    if (!hasDates || !checkIn || !checkOut || nightsCount == null || nightsCount <= 0) {
      return null;
    }
    if (isParking) {
      return computeParkingStayTotal(
        checkIn,
        checkOut,
        parkingPricingDefaultsFromDto({
          weekdayNightlyRate: baseRate,
          weekendNightlyRate: weekendNightlyRate ?? baseRate,
        }),
        dateOverrides ?? {}
      );
    }
    return baseRate * nightsCount;
  }, [
    baseRate,
    checkIn,
    checkOut,
    dateOverrides,
    hasDates,
    isParking,
    nightsCount,
    weekendNightlyRate,
  ]);

  const taxesAmount =
    staySubtotal != null && showPropertyFees ? Math.round(staySubtotal * taxRate) : 0;
  const grandTotal =
    staySubtotal != null
      ? staySubtotal + (showPropertyFees ? (cleaningFee ?? 0) + taxesAmount : 0)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="sticky top-24"
    >
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-xl">
        {/* ── Header: price + rating ──────────────────────────────────────── */}
        <div className="border-border border-b p-6">
          <div className="mb-2 flex items-baseline justify-between">
            <div>
              <span className="text-foreground text-2xl font-bold">{formatCurrency(baseRate)}</span>
              <span className="text-muted-foreground"> / night</span>
            </div>
            {showRating ? (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-foreground font-medium">{rating}</span>
                <span className="text-muted-foreground">({reviews})</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Booking form ─────────────────────────────────────────────────── */}
        <div className="p-6">
          {/* Date Picker Fields */}
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            aria-label="Select check-in and check-out dates"
            className={cn(
              'border-border mb-4 grid w-full cursor-pointer grid-cols-2 overflow-hidden rounded-xl border text-left transition-all duration-200',
              'hover:border-primary/60 focus-visible:ring-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              hasDates && 'border-primary/40 dark:border-primary/50'
            )}
          >
            {/* Check-in field */}
            <div
              className={cn(
                'border-border border-r p-3 transition-colors',
                hasCheckIn && !hasDates && 'bg-primary/10'
              )}
            >
              <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest">
                Check-in
              </p>
              <div className="flex items-center gap-2">
                <CalendarDays
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    checkIn ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    checkIn ? 'text-foreground' : 'text-muted-foreground/50'
                  )}
                >
                  {checkIn ? formatDateDisplay(checkIn) : 'Add date'}
                </span>
              </div>
            </div>

            {/* Check-out field */}
            <div className={cn('p-3 transition-colors', hasDates && 'bg-primary/10')}>
              <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest">
                Check-out
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      checkOut ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      checkOut ? 'text-foreground' : 'text-muted-foreground/50'
                    )}
                  >
                    {checkOut ? formatDateDisplay(checkOut) : 'Add date'}
                  </span>
                </div>
                <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5" />
              </div>
            </div>
          </button>

          {/* Nights indicator */}
          {hasDates && nightsCount !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-primary/10 -mt-2 mb-4 flex items-center justify-between rounded-lg px-3 py-2"
            >
              <span className="text-muted-foreground text-xs">
                {nightsCount} night{nightsCount !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => handleDatesChange(null, null)}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors"
              >
                Clear
              </button>
            </motion.div>
          )}

          {/* Guest Picker */}
          {showGuests ? (
            <div className="relative mb-6">
              <button
                type="button"
                onClick={() => setShowGuestPicker(!showGuestPicker)}
                className="border-border hover:border-primary/60 focus-visible:ring-primary flex w-full items-center justify-between rounded-xl border p-3 transition-colors hover:shadow-sm focus-visible:outline-none focus-visible:ring-2"
              >
                <div>
                  <p className="text-muted-foreground mb-1 text-left text-[10px] font-semibold uppercase tracking-widest">
                    Guests
                  </p>
                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground h-4 w-4" />
                    <span className="text-foreground text-sm">
                      {guests} guest{guests !== 1 && 's'}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-5 w-5 transition-transform duration-200',
                    showGuestPicker && 'rotate-180'
                  )}
                />
              </button>

              {showGuestPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="border-border bg-card absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border p-4 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-medium">Guests</p>
                      <p className="text-muted-foreground text-sm">Maximum {maxGuests} guests</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        disabled={guests <= 1}
                        aria-label="Decrease guests"
                        className="border-border text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="text-foreground w-8 text-center font-medium">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests(Math.min(maxGuests ?? 10, guests + 1))}
                        disabled={guests >= (maxGuests ?? 10)}
                        aria-label="Increase guests"
                        className="border-border text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : null}

          {/* Reserve Button */}
          <Button
            type="button"
            onClick={reserve}
            className="w-full rounded-xl py-6 text-lg font-semibold"
          >
            Reserve
          </Button>

          {/* Price Breakdown — shows once dates are selected */}
          <div className="space-y-3 pt-4">
            {hasDates && nightsCount && staySubtotal != null && grandTotal != null && (
              <>
                <div className="text-muted-foreground flex items-center justify-between">
                  <span className={isParking ? '' : 'underline'}>
                    {isParking
                      ? `Parking · ${nightsCount} night${nightsCount !== 1 ? 's' : ''}`
                      : `${formatCurrency(baseRate)} × ${nightsCount} night${nightsCount !== 1 ? 's' : ''}`}
                  </span>
                  <span>{formatCurrency(staySubtotal)}</span>
                </div>
                {showPropertyFees && cleaningFee ? (
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      Cleaning fee
                      <Info className="h-3.5 w-3.5" />
                    </span>
                    <span>{formatCurrency(cleaningFee)}</span>
                  </div>
                ) : null}
                {showPropertyFees ? (
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      Taxes ({Math.round(taxRate * 100)}%)
                      <Info className="h-3.5 w-3.5" />
                    </span>
                    <span>{formatCurrency(taxesAmount)}</span>
                  </div>
                ) : null}
                <div className="border-border text-foreground flex items-center justify-between border-t pt-3 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>

                {/* Security Deposit Notice */}
                {showPropertyFees && securityDeposit ? (
                  <div className="bg-muted/50 text-muted-foreground mt-4 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Shield className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        A refundable security deposit of{' '}
                        <span className="text-foreground font-medium">
                          {formatCurrency(securityDeposit)}
                        </span>{' '}
                        will be collected at check-in.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        {cancellationShortLabel ? (
          <div className="flex items-center gap-1">
            <Check className="text-primary h-4 w-4" />
            <span>{cancellationShortLabel}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <Shield className="text-primary h-4 w-4" />
          <span>Secure booking</span>
        </div>
      </div>

      {/* Calendar Modal — parent renders when dates are controlled externally */}
      {!calendarControlled ? (
        <BookingCalendarModal
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          propertySlug={resolvedSlug}
          propertyName={resolvedName}
          checkIn={checkIn}
          checkOut={checkOut}
          onDatesChange={handleDatesChange}
        />
      ) : null}
    </motion.div>
  );
}
