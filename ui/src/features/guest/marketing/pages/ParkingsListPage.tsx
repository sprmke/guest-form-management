import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import { ParkingFilters, ParkingToolbar } from '@/features/guest/marketing/developments/components';
import type { ParkingSortKey } from '@/features/guest/marketing/developments/lib/parkingSlotFilters';
import { DEFAULT_PARKING_FILTERS } from '@/features/guest/marketing/developments/lib/parkingSlotFilters';
import { usePublicParkings } from '@/features/guest/marketing/parkings/hooks/usePublicParkings';
import {
  EMPTY_PARKINGS_FACETS,
  filterStateToParkingsQuery,
  parseParkingsQuery,
  parkingsQueryToFilterState,
  toParkingListEntry,
  writeParkingsQuery,
  type ParkingsListingQuery,
} from '@/features/guest/marketing/parkings/lib/parkingsQuery';
import { ParkingsByLocation, ParkingsHero } from '@/features/guest/marketing/parkings/components';
import { ListingActiveFilterChips } from '@/features/guest/marketing/shared/components/ListingActiveFilterChips';
import { ListingFilteredEmpty } from '@/features/guest/marketing/shared/components/ListingFilteredEmpty';
import {
  buildParkingFilterChips,
  removeParkingFilterChip,
} from '@/features/guest/marketing/shared/lib/listingFilterChips';

import { Button } from '@/components/ui/button';

export function ParkingsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseParkingsQuery(searchParams), [searchParams]);
  const { data, isLoading, isError, isFetching } = usePublicParkings(query);
  const reduceMotion = useReducedMotion();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const patchQuery = useCallback(
    (partial: Partial<ParkingsListingQuery>) => {
      setSearchParams(
        (prev) => writeParkingsQuery({ ...parseParkingsQuery(prev), ...partial }, prev),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const filters = useMemo(() => parkingsQueryToFilterState(query), [query]);
  const facets = data?.facets ?? EMPTY_PARKINGS_FACETS;
  const towerOptions = useMemo(() => facets.towers.map((entry) => entry.tower), [facets.towers]);

  const setFilters = useCallback(
    (nextFilters: ReturnType<typeof parkingsQueryToFilterState>) => {
      setSearchParams(
        (prev) =>
          writeParkingsQuery(
            filterStateToParkingsQuery(nextFilters, parseParkingsQuery(prev)),
            prev
          ),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const entries = useMemo(() => (data?.data ?? []).map(toParkingListEntry), [data?.data]);
  const totalResults = data?.total ?? 0;
  const filterChips = useMemo(() => buildParkingFilterChips(filters), [filters]);
  const hasActiveFilters = filterChips.length > 0;

  return (
    <div className="bg-background min-h-screen">
      <ParkingsHero />

      <div className="border-border bg-background/95 sticky top-16 z-30 border-b p-4 backdrop-blur-sm lg:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileFiltersOpen(true)}
          className="min-h-[44px] w-full gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters & Sort
        </Button>
      </div>

      <div className="flex min-w-0">
        <ParkingFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          towerOptions={towerOptions}
        />

        <ParkingFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile
          filters={filters}
          onFiltersChange={setFilters}
          towerOptions={towerOptions}
          sortBy={query.sort}
          onSortChange={(sort) => patchQuery({ sort: sort as ParkingSortKey, page: 1 })}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <ParkingToolbar
            sortBy={query.sort}
            onSortChange={(sort) => patchQuery({ sort: sort as ParkingSortKey, page: 1 })}
            totalResults={totalResults}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          {hasActiveFilters ? (
            <div className="border-border border-b px-4 py-3 sm:px-6">
              <ListingActiveFilterChips
                chips={filterChips}
                onRemove={(id) => setFilters(removeParkingFilterChip(filters, id))}
                onClearAll={() => setFilters(DEFAULT_PARKING_FILTERS)}
              />
            </div>
          ) : null}

          {isError ? (
            <div className="text-muted-foreground p-6 text-sm" role="alert">
              Could not load parking slots.
            </div>
          ) : isLoading && !data ? (
            <div className="text-muted-foreground p-6 text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <ListingFilteredEmpty
              noun="slots"
              onClearFilters={() => setFilters(DEFAULT_PARKING_FILTERS)}
              onOpenFilters={() => {
                if (
                  typeof window !== 'undefined' &&
                  window.matchMedia('(max-width: 1023px)').matches
                ) {
                  setMobileFiltersOpen(true);
                } else {
                  setFiltersOpen(true);
                }
              }}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`parkings-${totalResults}-${query.sort}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: isFetching ? 0.7 : 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="min-w-0 p-4 sm:p-6"
              >
                <ParkingsByLocation entries={entries} />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
