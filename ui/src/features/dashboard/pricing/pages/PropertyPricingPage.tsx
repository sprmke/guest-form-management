import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  format,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfToday,
  getDaysInMonth,
} from 'date-fns';
import { toast } from 'sonner';

import {
  CalendarBookingCelebration,
  type CalendarBookingCelebrationTrigger,
} from '@/features/dashboard/bookings/components/calendar/CalendarBookingCelebration';
import { buildOccupancyByDay } from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';
import { PricingCalendarBookingModal } from '@/features/dashboard/pricing/components/PricingCalendarBookingModal';
import { PricingCalendarGrid } from '@/features/dashboard/pricing/components/PricingCalendarGrid';
import { PricingDateModal } from '@/features/dashboard/pricing/components/PricingDateModal';
import { PricingRatesFormCard } from '@/features/dashboard/pricing/components/PricingRatesFormCard';
import { PricingSaveDialog } from '@/features/dashboard/pricing/components/PricingSaveDialog';
import { PricingStatsRow } from '@/features/dashboard/pricing/components/PricingStatsRow';
import {
  usePropertyPricing,
  useSavePropertyPricing,
} from '@/features/dashboard/pricing/hooks/usePropertyPricing';
import { findHolidayRuleForDate } from '@/features/dashboard/pricing/lib/phHolidayRules';
import {
  contiguousDateRanges,
  dateKey,
  mergeDateRateOverrides,
} from '@/features/dashboard/pricing/lib/pricingCalendarUtils';
import {
  propertyPricingDefaultsFromDto,
  resolveBookingNightlyForDate,
  resolveBookingRateTotal,
  resolveNightlyRateForDate,
  resolveHolidayRules,
  type PropertyPricingDefaults,
} from '@/features/dashboard/pricing/lib/pricingCompute';
import {
  DEFAULT_WEEKDAY_NIGHTLY_RATE,
  DEFAULT_WEEKEND_NIGHTLY_RATE,
  feesFromPricingDefaults,
  INITIAL_PROPERTY_FEES,
  type PropertyFeeConfig,
  type PropertyFeeId,
} from '@/features/dashboard/pricing/lib/pricingDefaults';
import {
  buildFeesOnlySavePatch,
  buildPricingSavePatch,
  dateOverridesRecordFromMap,
  pricingBaselineFromDefaults,
  pricingFormHasBaseRateChanges,
  pricingFormHasFeeChanges,
  type PricingFormBaseline,
  type PricingSaveOptions,
} from '@/features/dashboard/pricing/lib/pricingSave';
import type {
  PropertyPricingCalendarBooking,
  PropertyPricingDto,
} from '@/features/dashboard/pricing/lib/propertyPricingApi';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { BookingsCalendarSkeleton } from '@/components/skeletons/AdminSkeletons';

/** A viewed month at/above this many bookings triggers the busy-month celebration. */
const BUSY_MONTH_CELEBRATION_THRESHOLD = 20;

export function PropertyPricingPage() {
  const { data: access } = usePropertyPermissions();
  const permissions = access?.permissions;
  const canEdit = hasPropertyPermission(permissions, 'pricing:edit');

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const { data: pricingData, isLoading, isError, error } = usePropertyPricing(currentMonth);
  const saveMutation = useSavePropertyPricing();

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const justSelectedRef = useRef(false);
  const selectedDatesRef = useRef(selectedDates);
  selectedDatesRef.current = selectedDates;

  const [weekdayRate, setWeekdayRate] = useState(DEFAULT_WEEKDAY_NIGHTLY_RATE);
  const [weekendRate, setWeekendRate] = useState(DEFAULT_WEEKEND_NIGHTLY_RATE);
  const holidayRuleDtos = pricingData?.holidayRules;
  const [bookedDateKeys, setBookedDateKeys] = useState<Set<string>>(() => new Set());
  const [blockedDateKeys, setBlockedDateKeys] = useState<Set<string>>(() => new Set());
  const [customDatePrices, setCustomDatePrices] = useState<Map<string, number>>(() => new Map());
  const [fees, setFees] = useState<PropertyFeeConfig[]>(() =>
    INITIAL_PROPERTY_FEES.map((fee) => ({ ...fee }))
  );

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PropertyPricingCalendarBooking | null>(
    null
  );
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const hydratedRef = useRef(false);
  const baselineRef = useRef<PricingFormBaseline | null>(null);

  const syncBaselineFromDto = useCallback((data: NonNullable<typeof pricingData>) => {
    baselineRef.current = pricingBaselineFromDefaults(propertyPricingDefaultsFromDto(data));
  }, []);

  useEffect(() => {
    if (!pricingData) return;

    setBookedDateKeys(new Set(pricingData.bookedDateKeys));
    setBlockedDateKeys(new Set(pricingData.blockedDateKeys));

    if (hasChanges || hydratedRef.current) return;

    const defaults = propertyPricingDefaultsFromDto(pricingData);
    setWeekdayRate(defaults.weekdayNightlyRate);
    setWeekendRate(defaults.weekendNightlyRate);
    setFees(feesFromPricingDefaults(defaults));
    setCustomDatePrices(new Map(Object.entries(pricingData.dateOverrides)));
    syncBaselineFromDto(pricingData);
    hydratedRef.current = true;
  }, [pricingData, hasChanges, syncBaselineFromDto]);

  const calendarBookings = pricingData?.calendarBookings ?? [];

  // Busy-month celebration: fires once per distinct month reaching the
  // occupied-days threshold, and again on navigating to another month that
  // also qualifies. Occupied days (not distinct booking count) tracks how
  // "full" the month looks on the grid.
  const [celebration, setCelebration] = useState<CalendarBookingCelebrationTrigger | null>(null);
  const celebratedMonthsRef = useRef<Set<string>>(new Set());
  const occupiedDaysThisMonth = pricingData?.bookedDateKeys.length ?? 0;

  useEffect(() => {
    if (isLoading || !pricingData) return;
    if (occupiedDaysThisMonth < BUSY_MONTH_CELEBRATION_THRESHOLD) return;
    const monthKey = format(currentMonth, 'yyyy-MM');
    if (celebratedMonthsRef.current.has(monthKey)) return;
    celebratedMonthsRef.current.add(monthKey);
    setCelebration({
      key: monthKey,
      count: occupiedDaysThisMonth,
      unitLabel: 'days booked',
      fullyBooked: occupiedDaysThisMonth >= getDaysInMonth(currentMonth),
    });
  }, [isLoading, pricingData, occupiedDaysThisMonth, currentMonth]);

  const pricingDefaults = useMemo((): PropertyPricingDefaults => {
    return {
      weekdayNightlyRate: weekdayRate,
      weekendNightlyRate: weekendRate,
      downPayment: 0,
      securityDeposit: 0,
      petFee: 0,
      parkingRateGuest: 0,
      guestAdditionalFee: 0,
    };
  }, [weekdayRate, weekendRate]);

  const dateOverridesRecord = useMemo(
    () => Object.fromEntries(customDatePrices.entries()),
    [customDatePrices]
  );

  const nightlyRateOptions = useMemo(
    () => ({
      dateOverrides: dateOverridesRecord,
      holidayRules: holidayRuleDtos,
    }),
    [dateOverridesRecord, holidayRuleDtos]
  );

  const bookingsByDay = useMemo(
    () =>
      buildOccupancyByDay(
        calendarBookings,
        (row) => row.check_in_date,
        (row) => row.check_out_date
      ),
    [calendarBookings]
  );

  const getPriceForDate = useCallback(
    (date: Date) => {
      const key = dateKey(date);
      const booking = bookingsByDay.get(key)?.[0];
      const isBooked = bookedDateKeys.has(key);
      const isBlocked = blockedDateKeys.has(key);

      if (booking) {
        return {
          price: resolveBookingNightlyForDate(booking, date, pricingDefaults, nightlyRateOptions),
          isCustom: false as const,
          isBooked: true,
          isBlocked,
        };
      }

      const customPrice = customDatePrices.get(key);
      if (customPrice !== undefined) {
        return { price: customPrice, isCustom: true as const, isBooked, isBlocked };
      }

      const rule = findHolidayRuleForDate(date, resolveHolidayRules(holidayRuleDtos));
      const price = resolveNightlyRateForDate(date, pricingDefaults, nightlyRateOptions);

      if (rule) {
        return { price, rule, isCustom: false as const, isBooked, isBlocked };
      }

      return { price, isCustom: false as const, isBooked, isBlocked };
    },
    [
      bookingsByDay,
      bookedDateKeys,
      blockedDateKeys,
      customDatePrices,
      holidayRuleDtos,
      pricingDefaults,
      nightlyRateOptions,
    ]
  );

  const getBookingDisplayTotal = useCallback(
    (booking: PropertyPricingCalendarBooking) =>
      resolveBookingRateTotal(booking, pricingDefaults, nightlyRateOptions),
    [pricingDefaults, nightlyRateOptions]
  );

  const openBookingModal = useCallback((booking: PropertyPricingCalendarBooking) => {
    setSelectedBooking(booking);
    setBookingModalOpen(true);
  }, []);

  const selectionMode = useMemo<'available' | 'blocked'>(() => {
    const first = selectedDates[0];
    return first && blockedDateKeys.has(dateKey(first)) ? 'blocked' : 'available';
  }, [selectedDates, blockedDateKeys]);

  const openDateModal = useCallback(
    (dates: Date[]) => {
      if (dates.length === 0) {
        setDateModalOpen(false);
        setNewPrice('');
        return;
      }
      const first = [...dates].sort((a, b) => a.getTime() - b.getTime())[0];
      if (first) {
        setNewPrice(String(getPriceForDate(first).price));
      }
      setDateModalOpen(true);
    },
    [getPriceForDate]
  );

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfToday()) || !canEdit || bookedDateKeys.has(dateKey(date))) {
      return;
    }
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const clickedIsBlocked = blockedDateKeys.has(dateKey(date));
    const firstSelected = selectedDates[0];
    const kindMismatch =
      firstSelected != null && blockedDateKeys.has(dateKey(firstSelected)) !== clickedIsBlocked;

    let next: Date[];
    if (kindMismatch) {
      next = [date];
    } else if (selectedDates.some((d) => isSameDay(d, date))) {
      next = selectedDates.filter((d) => !isSameDay(d, date));
    } else {
      next = [...selectedDates, date];
    }
    setSelectedDates(next);
    openDateModal(next);
  };

  const handleDateMouseDown = (date: Date) => {
    if (isBefore(date, startOfToday()) || !canEdit || bookedDateKeys.has(dateKey(date))) {
      return;
    }
    setIsSelecting(true);
    justSelectedRef.current = true;
    const next = [date];
    setSelectedDates(next);
  };

  const handleDateMouseEnter = (date: Date) => {
    if (
      !isSelecting ||
      isBefore(date, startOfToday()) ||
      !canEdit ||
      bookedDateKeys.has(dateKey(date))
    ) {
      return;
    }
    const firstDate = selectedDates[0];
    if (!firstDate) return;

    const anchorIsBlocked = blockedDateKeys.has(dateKey(firstDate));
    const forward = firstDate <= date;
    const ordered = forward
      ? eachDayOfInterval({ start: firstDate, end: date })
      : eachDayOfInterval({ start: date, end: firstDate }).reverse();

    const range: Date[] = [];
    for (const d of ordered) {
      if (isBefore(d, startOfToday())) continue;
      const key = dateKey(d);
      if (bookedDateKeys.has(key)) break;
      if (blockedDateKeys.has(key) !== anchorIsBlocked) break;
      range.push(d);
    }
    setSelectedDates(range);
  };

  const handleSelectionEnd = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 100);
    if (selectedDatesRef.current.length > 0) {
      openDateModal(selectedDatesRef.current);
    }
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setNewPrice('');
    setDateModalOpen(false);
  };

  const persistDateOverrides = (next: Map<string, number>, onSuccess?: () => void) => {
    saveMutation.mutate(
      { dateOverrides: dateOverridesRecordFromMap(next) },
      {
        onSuccess: (data) => {
          setCustomDatePrices(new Map(Object.entries(data.dateOverrides)));
          onSuccess?.();
        },
      }
    );
  };

  const baseNightlyForDate = useCallback(
    (date: Date) => {
      const key = dateKey(date);
      const overridesWithout = { ...dateOverridesRecord };
      delete overridesWithout[key];
      return resolveNightlyRateForDate(date, pricingDefaults, {
        dateOverrides: overridesWithout,
        holidayRules: holidayRuleDtos,
      });
    },
    [dateOverridesRecord, pricingDefaults, holidayRuleDtos]
  );

  const applyCustomPrice = () => {
    if (!newPrice.trim() || selectedDates.length === 0) return;
    const price = parseFloat(newPrice);
    if (!Number.isFinite(price) || price < 0) return;

    const next = mergeDateRateOverrides(customDatePrices, selectedDates, price, baseNightlyForDate);
    persistDateOverrides(next, clearSelection);
  };

  const resetSelectedToDefault = () => {
    const next = new Map(customDatePrices);
    selectedDates.forEach((date) => {
      next.delete(format(date, 'yyyy-MM-dd'));
    });
    persistDateOverrides(next, clearSelection);
  };

  const blockSelected = async () => {
    if (selectedDates.length === 0 || !canEdit) return;

    // Revalidate against current state right before mutating — availability may
    // have refreshed (new booking, or a date rolling into the past) since the
    // modal opened with a stale selection.
    const today = startOfToday();
    const stillBlockable = selectedDates.every((date) => {
      const key = dateKey(date);
      return !isBefore(date, today) && !bookedDateKeys.has(key) && !blockedDateKeys.has(key);
    });
    if (!stillBlockable) {
      toast.error('Dates unavailable');
      clearSelection();
      return;
    }

    const ranges = contiguousDateRanges(selectedDates);
    try {
      let lastData: PropertyPricingDto | undefined;
      for (const range of ranges) {
        lastData = await saveMutation.mutateAsync({ blockRange: range });
      }
      if (lastData) setBlockedDateKeys(new Set(lastData.blockedDateKeys));
      clearSelection();
    } catch {
      // toast handled by mutation onError
    }
  };

  const unblockSelected = () => {
    if (selectedDates.length === 0 || !canEdit) return;
    saveMutation.mutate(
      { unblockDateKeys: selectedDates.map((date) => dateKey(date)) },
      {
        onSuccess: (data) => {
          setBlockedDateKeys(new Set(data.blockedDateKeys));
          clearSelection();
        },
      }
    );
  };

  const updateFeeAmount = (feeId: PropertyFeeId, amount: number) => {
    setFees((prev) => prev.map((f) => (f.id === feeId ? { ...f, amount } : f)));
    setHasChanges(true);
  };

  const handleSaveConfirm = (options: PricingSaveOptions) => {
    const patch = buildPricingSavePatch(
      {
        weekdayRate,
        weekendRate,
        fees,
        customDatePrices,
        currentMonth,
        holidayRuleDtos,
        bookedDateKeys,
      },
      options
    );

    saveMutation.mutate(patch, {
      onSuccess: (data) => {
        setHasChanges(false);
        setSaveDialogOpen(false);
        setCustomDatePrices(new Map(Object.entries(data.dateOverrides)));
        syncBaselineFromDto(data);
        if (options.baseRateScope === 'all_future') {
          const defaults = propertyPricingDefaultsFromDto(data);
          setWeekdayRate(defaults.weekdayNightlyRate);
          setWeekendRate(defaults.weekendNightlyRate);
        }
        setFees(feesFromPricingDefaults(propertyPricingDefaultsFromDto(data)));
      },
    });
  };

  const handleFeesOnlySave = () => {
    const baseline = baselineRef.current;
    if (!baseline || !pricingFormHasFeeChanges(baseline, fees)) return;

    saveMutation.mutate(buildFeesOnlySavePatch(fees), {
      onSuccess: (data) => {
        setHasChanges(false);
        syncBaselineFromDto(data);
        setFees(feesFromPricingDefaults(propertyPricingDefaultsFromDto(data)));
      },
    });
  };

  const handleSaveClick = () => {
    const baseline = baselineRef.current;
    if (!baseline) return;

    if (pricingFormHasBaseRateChanges(baseline, weekdayRate, weekendRate)) {
      setSaveDialogOpen(true);
      return;
    }

    if (pricingFormHasFeeChanges(baseline, fees)) {
      handleFeesOnlySave();
    }
  };

  const feesTotal = useMemo(
    () => fees.reduce((sum, f) => sum + (Number.isFinite(f.amount) ? f.amount : 0), 0),
    [fees]
  );

  const suggestedPrice = useMemo(() => {
    if (selectedDates.length === 0) return weekdayRate;
    const first = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())[0];
    return first ? baseNightlyForDate(first) : weekdayRate;
  }, [baseNightlyForDate, selectedDates, weekdayRate]);

  if (isLoading && !hydratedRef.current) {
    return <BookingsCalendarSkeleton />;
  }

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
        {(error as Error)?.message ?? 'Failed to load pricing'}
      </div>
    );
  }

  return (
    <>
      <AdminMobilePage
        title="Calendar"
        subtitle="Manage pricing and availability."
        titleId="calendar-heading"
      >
        <PricingStatsRow
          weekdayRate={weekdayRate}
          weekendRate={weekendRate}
          customDatesCount={customDatePrices.size}
          enabledFeesTotal={feesTotal}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5">
          <PricingCalendarGrid
            currentMonth={currentMonth}
            selectedDates={selectedDates}
            bookings={calendarBookings}
            onMonthChange={setCurrentMonth}
            onDateClick={handleDateClick}
            onDateMouseDown={handleDateMouseDown}
            onDateMouseEnter={handleDateMouseEnter}
            onSelectionEnd={handleSelectionEnd}
            onBookingClick={openBookingModal}
            getPriceForDate={getPriceForDate}
            getBookingStayTotal={getBookingDisplayTotal}
          />

          <div className="lg:sticky lg:top-5">
            <PricingRatesFormCard
              weekdayRate={weekdayRate}
              weekendRate={weekendRate}
              fees={fees}
              readOnly={!canEdit}
              hasChanges={hasChanges}
              saving={saveMutation.isPending}
              onWeekdayChange={(value) => {
                setWeekdayRate(value);
                setHasChanges(true);
              }}
              onWeekendChange={(value) => {
                setWeekendRate(value);
                setHasChanges(true);
              }}
              onAmountChange={updateFeeAmount}
              onSaveClick={handleSaveClick}
            />
          </div>
        </div>
      </AdminMobilePage>

      <PricingDateModal
        open={dateModalOpen && selectedDates.length > 0 && canEdit}
        onOpenChange={(open) => {
          setDateModalOpen(open);
          if (!open) clearSelection();
        }}
        mode={selectionMode}
        selectedDates={selectedDates}
        suggestedPrice={suggestedPrice}
        newPrice={newPrice}
        onNewPriceChange={setNewPrice}
        onResetToDefault={resetSelectedToDefault}
        onApply={applyCustomPrice}
        onBlock={blockSelected}
        onUnblock={unblockSelected}
        saving={saveMutation.isPending}
      />

      <PricingSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        saving={saveMutation.isPending}
        onConfirm={handleSaveConfirm}
      />

      <PricingCalendarBookingModal
        booking={selectedBooking}
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        displayAmount={selectedBooking ? getBookingDisplayTotal(selectedBooking) : null}
      />

      <CalendarBookingCelebration trigger={celebration} onDone={() => setCelebration(null)} />
    </>
  );
}
