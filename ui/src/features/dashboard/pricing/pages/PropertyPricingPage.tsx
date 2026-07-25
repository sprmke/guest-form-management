import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { format, eachDayOfInterval, isSameDay, isBefore, startOfToday } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
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
import { dateKey } from '@/features/dashboard/pricing/lib/pricingCalendarUtils';
import {
  propertyPricingDefaultsFromDto,
  resolveNightlyRateForDate,
  resolveHolidayRules,
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
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

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
  const [customDatePrices, setCustomDatePrices] = useState<Map<string, number>>(() => new Map());
  const [fees, setFees] = useState<PropertyFeeConfig[]>(() =>
    INITIAL_PROPERTY_FEES.map((fee) => ({ ...fee }))
  );

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const hydratedRef = useRef(false);
  const baselineRef = useRef<PricingFormBaseline | null>(null);

  const syncBaselineFromDto = useCallback((data: NonNullable<typeof pricingData>) => {
    baselineRef.current = pricingBaselineFromDefaults(propertyPricingDefaultsFromDto(data));
  }, []);

  useEffect(() => {
    if (!pricingData) return;

    setBookedDateKeys(new Set(pricingData.bookedDateKeys));

    if (hasChanges || hydratedRef.current) return;

    const defaults = propertyPricingDefaultsFromDto(pricingData);
    setWeekdayRate(defaults.weekdayNightlyRate);
    setWeekendRate(defaults.weekendNightlyRate);
    setFees(feesFromPricingDefaults(defaults));
    setCustomDatePrices(new Map(Object.entries(pricingData.dateOverrides)));
    syncBaselineFromDto(pricingData);
    hydratedRef.current = true;
  }, [pricingData, hasChanges, syncBaselineFromDto]);

  const getPriceForDate = useCallback(
    (date: Date) => {
      const key = dateKey(date);
      const isBooked = bookedDateKeys.has(key);
      const customPrice = customDatePrices.get(key);
      if (customPrice !== undefined) {
        return { price: customPrice, isCustom: true as const, isBooked };
      }

      const defaults = {
        weekdayNightlyRate: weekdayRate,
        weekendNightlyRate: weekendRate,
        downPayment: 0,
        securityDeposit: 0,
        petFee: 0,
        parkingRateGuest: 0,
        guestAdditionalFee: 0,
      };
      const rule = findHolidayRuleForDate(date, resolveHolidayRules(holidayRuleDtos));
      const price = resolveNightlyRateForDate(date, defaults, {
        holidayRules: holidayRuleDtos,
      });

      if (rule) {
        return { price, rule, isCustom: false as const, isBooked };
      }

      return { price, isCustom: false as const, isBooked };
    },
    [bookedDateKeys, customDatePrices, holidayRuleDtos, weekdayRate, weekendRate]
  );

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

    let next: Date[];
    if (selectedDates.some((d) => isSameDay(d, date))) {
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

    const start = firstDate < date ? firstDate : date;
    const end = firstDate < date ? date : firstDate;
    const range = eachDayOfInterval({ start, end }).filter((d) => !isBefore(d, startOfToday()));
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

  const applyCustomPrice = () => {
    if (!newPrice.trim() || selectedDates.length === 0) return;
    const price = parseFloat(newPrice);
    if (!Number.isFinite(price) || price < 0) return;

    const next = new Map(customDatePrices);
    selectedDates.forEach((date) => {
      next.set(format(date, 'yyyy-MM-dd'), price);
    });
    persistDateOverrides(next, clearSelection);
  };

  const resetSelectedToDefault = () => {
    const next = new Map(customDatePrices);
    selectedDates.forEach((date) => {
      next.delete(format(date, 'yyyy-MM-dd'));
    });
    persistDateOverrides(next, clearSelection);
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
    return first ? getPriceForDate(first).price : weekdayRate;
  }, [getPriceForDate, selectedDates, weekdayRate]);

  if (isLoading && !hydratedRef.current) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
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
      <div className="space-y-3 sm:space-y-4">
        <AdminPageHeader
          id="pricing-heading"
          title="Pricing"
          subtitle="Manage booking rates and fees for this property."
          variant="compact"
        />

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
            onMonthChange={setCurrentMonth}
            onDateClick={handleDateClick}
            onDateMouseDown={handleDateMouseDown}
            onDateMouseEnter={handleDateMouseEnter}
            onSelectionEnd={handleSelectionEnd}
            getPriceForDate={getPriceForDate}
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
      </div>

      <PricingDateModal
        open={dateModalOpen && selectedDates.length > 0 && canEdit}
        onOpenChange={(open) => {
          setDateModalOpen(open);
          if (!open) clearSelection();
        }}
        selectedDates={selectedDates}
        suggestedPrice={suggestedPrice}
        newPrice={newPrice}
        onNewPriceChange={setNewPrice}
        onClearSelection={clearSelection}
        onResetToDefault={resetSelectedToDefault}
        onApply={applyCustomPrice}
        saving={saveMutation.isPending}
      />

      <PricingSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        saving={saveMutation.isPending}
        onConfirm={handleSaveConfirm}
      />
    </>
  );
}
