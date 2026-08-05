import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

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
import { ParkingsEntriesGrid, ParkingsHero } from '@/features/guest/marketing/parkings/components';
import { filterParkingEntriesByLocationSlug } from '@/features/guest/marketing/parkings/lib/groupParkingsByLocation';
import {
  buildParkingListEntries,
  parkingSlotsFromEntries,
} from '@/features/guest/marketing/parkings/lib/parkingListEntries';

import { Button } from '@/components/ui/button';

export function ParkingsLocationPage() {
  const { location = '' } = useParams<{ location: string }>();
  const allEntries = useMemo(() => buildParkingListEntries(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ParkingSortKey>('tower');
  const [filters, setFilters] = useState<ParkingFilterState>(DEFAULT_PARKING_FILTERS);

  const locationEntries = useMemo(
    () => filterParkingEntriesByLocationSlug(allEntries, location),
    [allEntries, location]
  );

  const city = locationEntries[0]?.city ?? null;

  const insideTowerOptions = useMemo(
    () => uniqueTowersFromInsideSlots(parkingSlotsFromEntries(locationEntries)),
    [locationEntries]
  );

  const filteredEntries = useMemo(() => {
    const emptySearch = { location: '', checkIn: '', checkOut: '', guests: '' };
    const filteredSlots = filterParkingSlots(
      parkingSlotsFromEntries(locationEntries),
      filters,
      emptySearch
    );
    const sortedSlots = sortParkingSlots(filteredSlots, sortBy);
    const order = new Map(sortedSlots.map((slot, index) => [slot.id, index]));
    return [...locationEntries]
      .filter((entry) => order.has(entry.slot.id))
      .sort((a, b) => (order.get(a.slot.id) ?? 0) - (order.get(b.slot.id) ?? 0));
  }, [locationEntries, filters, sortBy]);

  if (!city) {
    return <Navigate to="/parkings" replace />;
  }

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

      <div className="flex">
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

          <h1 className="text-foreground px-4 pt-4 text-lg font-semibold tracking-tight sm:px-6 sm:pt-5 sm:text-xl">
            Parking in {city}
          </h1>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${location}-${filteredEntries.length}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 p-4 sm:p-6"
            >
              <ParkingsEntriesGrid entries={filteredEntries} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
