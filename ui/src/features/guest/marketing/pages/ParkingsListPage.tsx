import { useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import { ParkingFilters, ParkingToolbar } from '@/features/guest/marketing/developments/components';
import {
  DEFAULT_PARKING_FILTERS,
  filterParkingSlots,
  sortParkingSlots,
  uniqueTowersFromInsideSlots,
  type ParkingFilterState,
  type ParkingSortKey,
} from '@/features/guest/marketing/developments/lib/parkingSlotFilters';
import { ParkingsByLocation, ParkingsHero } from '@/features/guest/marketing/parkings/components';
import {
  buildParkingListEntries,
  parkingSlotsFromEntries,
} from '@/features/guest/marketing/parkings/lib/parkingListEntries';

import { Button } from '@/components/ui/button';

export function ParkingsListPage() {
  const allEntries = useMemo(() => buildParkingListEntries(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ParkingSortKey>('price_asc');
  const [filters, setFilters] = useState<ParkingFilterState>(DEFAULT_PARKING_FILTERS);

  const insideTowerOptions = useMemo(
    () => uniqueTowersFromInsideSlots(parkingSlotsFromEntries(allEntries)),
    [allEntries]
  );

  const filteredEntries = useMemo(() => {
    const emptySearch = { location: '', checkIn: '', checkOut: '', guests: '' };
    const filteredSlots = filterParkingSlots(
      parkingSlotsFromEntries(allEntries),
      filters,
      emptySearch
    );
    const sortedSlots = sortParkingSlots(filteredSlots, sortBy);
    const order = new Map(sortedSlots.map((slot, index) => [slot.id, index]));
    return [...allEntries]
      .filter((entry) => order.has(entry.slot.id))
      .sort((a, b) => (order.get(a.slot.id) ?? 0) - (order.get(b.slot.id) ?? 0));
  }, [allEntries, filters, sortBy]);

  return (
    <div className="bg-background min-h-screen">
      <ParkingsHero />

      <div className="border-border bg-background/95 sticky top-16 z-30 border-b p-4 backdrop-blur-sm lg:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileFiltersOpen(true)}
          className="min-h-[44px] w-full gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters & Sort
        </Button>
      </div>

      <div className="flex min-w-0">
        <ParkingFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          insideTowerOptions={insideTowerOptions}
        />

        <ParkingFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile
          filters={filters}
          onFiltersChange={setFilters}
          insideTowerOptions={insideTowerOptions}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <ParkingToolbar
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalResults={filteredEntries.length}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={`parkings-${filteredEntries.length}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 p-4 sm:p-6"
            >
              <ParkingsByLocation entries={filteredEntries} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
