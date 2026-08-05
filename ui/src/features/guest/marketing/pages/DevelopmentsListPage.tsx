import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  DevelopmentsHero,
  DevelopmentsFilters,
  DevelopmentsToolbar,
  DevelopmentsGrid,
  DevelopmentsByLocation,
  DevelopmentsMap,
  type DevelopmentViewMode,
} from '@/features/guest/marketing/developments/components';
import { usePublicDevelopments } from '@/features/guest/marketing/developments/hooks/usePublicDevelopments';
import {
  clearDevelopmentFilters,
  EMPTY_DEVELOPMENTS_FACETS,
  parseDevelopmentsQuery,
  toDevelopmentCard,
  writeDevelopmentsQuery,
  type DevelopmentsListingQuery,
  type DevelopmentsSort,
} from '@/features/guest/marketing/developments/lib/developmentsQuery';
import { ListingActiveFilterChips } from '@/features/guest/marketing/shared/components/ListingActiveFilterChips';
import { ListingFilteredEmpty } from '@/features/guest/marketing/shared/components/ListingFilteredEmpty';
import {
  buildDevelopmentFilterChips,
  removeDevelopmentFilterChip,
} from '@/features/guest/marketing/shared/lib/listingFilterChips';

import { Button } from '@/components/ui/button';

function parseViewMode(raw: string | null): DevelopmentViewMode {
  if (raw === 'list' || raw === 'map') return raw;
  return 'grid';
}

export function DevelopmentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseDevelopmentsQuery(searchParams), [searchParams]);
  const viewMode = parseViewMode(searchParams.get('view'));
  const { data, isLoading, isError, isFetching } = usePublicDevelopments(query);
  const reduceMotion = useReducedMotion();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const patchQuery = useCallback(
    (partial: Partial<DevelopmentsListingQuery>) => {
      setSearchParams(
        (prev) => writeDevelopmentsQuery({ ...parseDevelopmentsQuery(prev), ...partial }, prev),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilters = useCallback(
    (next: DevelopmentsListingQuery) => {
      setSearchParams(
        (prev) =>
          writeDevelopmentsQuery(
            {
              ...next,
              swLat: null,
              swLng: null,
              neLat: null,
              neLng: null,
              page: 1,
            },
            prev
          ),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setViewMode = useCallback(
    (mode: DevelopmentViewMode) => {
      setSearchParams(
        (prev) => {
          const next = writeDevelopmentsQuery(
            {
              ...parseDevelopmentsQuery(prev),
              ...(mode !== 'map' ? { swLat: null, swLng: null, neLat: null, neLng: null } : {}),
            },
            prev
          );
          if (mode === 'grid') next.delete('view');
          else next.set('view', mode);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const developments = useMemo(() => (data?.data ?? []).map(toDevelopmentCard), [data?.data]);
  const facets = data?.facets ?? EMPTY_DEVELOPMENTS_FACETS;
  const totalResults = data?.total ?? 0;
  const filterChips = useMemo(() => buildDevelopmentFilterChips(query, facets), [query, facets]);
  const hasActiveFilters = filterChips.length > 0;

  return (
    <div className="bg-background min-h-screen">
      <DevelopmentsHero />

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
        <DevelopmentsFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
          value={query}
          onChange={setFilters}
          facets={facets}
        />

        <DevelopmentsFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
          value={query}
          onChange={setFilters}
          facets={facets}
          sortBy={query.sort}
          onSortChange={(sort) => patchQuery({ sort: sort as DevelopmentsSort, page: 1 })}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <DevelopmentsToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={query.sort}
            onSortChange={(sort) => patchQuery({ sort: sort as DevelopmentsSort, page: 1 })}
            totalResults={totalResults}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          {hasActiveFilters ? (
            <div className="border-border border-b px-4 py-3 sm:px-6">
              <ListingActiveFilterChips
                chips={filterChips}
                onRemove={(id) => setFilters(removeDevelopmentFilterChip(query, id))}
                onClearAll={() => setFilters(clearDevelopmentFilters(query))}
              />
            </div>
          ) : null}

          {isError ? (
            <div className="text-muted-foreground p-6 text-sm" role="alert">
              Could not load developments.
            </div>
          ) : isLoading && !data ? (
            <div className="text-muted-foreground p-6 text-sm">Loading…</div>
          ) : developments.length === 0 ? (
            <ListingFilteredEmpty
              noun="developments"
              onClearFilters={() => setFilters(clearDevelopmentFilters(query))}
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
              {viewMode === 'map' ? (
                <motion.div
                  key="map"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="min-w-0 p-4 sm:p-6"
                >
                  <DevelopmentsMap
                    developments={developments}
                    totalInView={totalResults}
                    onViewportChange={(bbox) =>
                      patchQuery({
                        swLat: bbox.swLat,
                        swLng: bbox.swLng,
                        neLat: bbox.neLat,
                        neLng: bbox.neLng,
                        page: 1,
                      })
                    }
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={viewMode}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: isFetching ? 0.7 : 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="min-w-0 p-4 sm:p-6"
                >
                  {viewMode === 'grid' ? (
                    <DevelopmentsByLocation developments={developments} />
                  ) : (
                    <DevelopmentsGrid developments={developments} viewMode={viewMode} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
