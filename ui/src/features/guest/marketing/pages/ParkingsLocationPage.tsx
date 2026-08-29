import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
import { useCaptureParkingLinkStay } from '@/features/guest/marketing/parkings/hooks/useCaptureParkingLinkStay';
import { usePublicParkings } from '@/features/guest/marketing/parkings/hooks/usePublicParkings';
import { parkingSlotsFromEntries } from '@/features/guest/marketing/parkings/lib/parkingListEntries';
import {
  DEFAULT_PARKINGS_QUERY,
  toParkingListEntry,
} from '@/features/guest/marketing/parkings/lib/parkingsQuery';
import { normalizeCityPlace } from '@/features/guest/marketing/shared/lib/locationSlug';

import { ListingGridSkeleton } from '@/components/skeletons/ListingGridSkeleton';
import { Button } from '@/components/ui/button';

export function ParkingsLocationPage() {
  useCaptureParkingLinkStay();
  const { location = '' } = useParams<{ location: string }>();
  const locationSlug = location.trim().toLowerCase();
  const reduceMotion = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ParkingSortKey>('tower');
  const [filters, setFilters] = useState<ParkingFilterState>(DEFAULT_PARKING_FILTERS);
  const [page, setPage] = useState(1);

  const listingQuery = useMemo(
    () => ({
      ...DEFAULT_PARKINGS_QUERY,
      locationSlug,
      page,
      pageSize: 48,
    }),
    [locationSlug, page]
  );

  const { data, isLoading, isError, isFetching, refetch } = usePublicParkings(
    listingQuery,
    Boolean(locationSlug)
  );

  const locationEntries = useMemo(() => (data?.data ?? []).map(toParkingListEntry), [data?.data]);

  const city = locationEntries[0] != null ? normalizeCityPlace(locationEntries[0].city) : null;

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

  const totalResults = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 48;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize) || 1);

  if (!locationSlug) {
    return <Navigate to="/parkings" replace />;
  }

  if (!isLoading && !isError && totalResults === 0) {
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
          isMobile={false}
          filters={filters}
          onFiltersChange={setFilters}
          towerOptions={insideTowerOptions}
        />

        <ParkingFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
          filters={filters}
          onFiltersChange={setFilters}
          towerOptions={insideTowerOptions}
          sortBy={sortBy}
          onSortChange={(sort) => setSortBy(sort as ParkingSortKey)}
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
            Parking in {city ?? '…'}
          </h1>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16" role="alert">
              <p className="text-muted-foreground text-sm">Could not load parking.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="min-w-0 p-4 sm:p-6">
              <ListingGridSkeleton
                columnsClassName="grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                imageAspectClassName="aspect-square"
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${locationSlug}-${page}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: isFetching ? 0.7 : 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="min-w-0 space-y-6 p-4 sm:p-6"
              >
                <ParkingsEntriesGrid entries={filteredEntries} />
                {totalPages > 1 ? (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px]"
                      disabled={page <= 1 || isFetching}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px]"
                      disabled={page >= totalPages || isFetching}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
