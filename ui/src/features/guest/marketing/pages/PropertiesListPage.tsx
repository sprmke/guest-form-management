import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  PropertiesHero,
  PropertiesFilters,
  PropertiesToolbar,
  PropertiesByLocation,
  PropertyListItem,
  PropertiesMap,
  type ViewMode,
} from '@/features/guest/marketing/properties/components';
import { usePublicProperties } from '@/features/guest/marketing/properties/hooks/usePublicProperties';
import {
  clearPropertyFilters,
  EMPTY_PROPERTIES_FACETS,
  parsePropertiesQuery,
  writePropertiesQuery,
  type PropertiesListingQuery,
  type PropertiesSort,
  type PublicPropertyListItem,
} from '@/features/guest/marketing/properties/lib/propertiesQuery';
import type { Property } from '@/features/guest/marketing/properties/components/PropertyCard';
import { ListingActiveFilterChips } from '@/features/guest/marketing/shared/components/ListingActiveFilterChips';
import { ListingFilteredEmpty } from '@/features/guest/marketing/shared/components/ListingFilteredEmpty';
import {
  buildPropertyFilterChips,
  removePropertyFilterChip,
} from '@/features/guest/marketing/shared/lib/listingFilterChips';
import { resolveListingImages } from '@/features/guest/marketing/shared/lib/mockListingImages';

import { Button } from '@/components/ui/button';

function toPropertyCard(item: PublicPropertyListItem): Property {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    location: item.location,
    price: item.price,
    rating: item.rating,
    reviews: item.reviews,
    images: resolveListingImages(item.images, 'property', item.slug),
    type: item.type,
    guests: item.guests,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    amenities: item.amenities,
    isSuperhost: item.isSuperhost,
    isNew: item.isNew,
    developmentSlug: item.developmentSlug,
    developmentName: item.developmentName,
    tower: item.tower,
    unitNumber: item.unitNumber,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

function parseViewMode(raw: string | null): ViewMode {
  if (raw === 'list' || raw === 'map') return raw;
  return 'grid';
}

export function PropertiesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parsePropertiesQuery(searchParams), [searchParams]);
  const viewMode = parseViewMode(searchParams.get('view'));
  const { data, isLoading, isError, isFetching } = usePublicProperties(query);
  const reduceMotion = useReducedMotion();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const patchQuery = useCallback(
    (partial: Partial<PropertiesListingQuery>) => {
      setSearchParams(
        (prev) => writePropertiesQuery({ ...parsePropertiesQuery(prev), ...partial }, prev),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilters = useCallback(
    (next: PropertiesListingQuery) => {
      setSearchParams(
        (prev) =>
          writePropertiesQuery(
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
    (mode: ViewMode) => {
      setSearchParams(
        (prev) => {
          const next = writePropertiesQuery(
            {
              ...parsePropertiesQuery(prev),
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

  const properties = useMemo(() => (data?.data ?? []).map(toPropertyCard), [data?.data]);
  const facets = data?.facets ?? EMPTY_PROPERTIES_FACETS;
  const totalResults = data?.total ?? 0;
  const filterChips = useMemo(() => buildPropertyFilterChips(query, facets), [query, facets]);
  const hasActiveFilters = filterChips.length > 0;
  return (
    <div className="bg-background min-h-screen">
      <PropertiesHero />

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
        <PropertiesFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
          value={query}
          onChange={setFilters}
          facets={facets}
        />

        <PropertiesFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
          value={query}
          onChange={setFilters}
          facets={facets}
          sortBy={query.sort}
          onSortChange={(sort) => patchQuery({ sort: sort as PropertiesSort, page: 1 })}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <PropertiesToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={query.sort}
            onSortChange={(sort) => patchQuery({ sort: sort as PropertiesSort, page: 1 })}
            totalResults={totalResults}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          {hasActiveFilters ? (
            <div className="border-border border-b px-4 py-3 sm:px-6">
              <ListingActiveFilterChips
                chips={filterChips}
                onRemove={(id) => setFilters(removePropertyFilterChip(query, id))}
                onClearAll={() => setFilters(clearPropertyFilters(query))}
              />
            </div>
          ) : null}

          {isError ? (
            <div className="text-muted-foreground p-6 text-sm" role="alert">
              Could not load properties.
            </div>
          ) : isLoading && !data ? (
            <div className="text-muted-foreground p-6 text-sm">Loading…</div>
          ) : properties.length === 0 ? (
            <ListingFilteredEmpty
              noun="properties"
              onClearFilters={() => setFilters(clearPropertyFilters(query))}
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
                  <PropertiesMap
                    properties={properties}
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
                    <PropertiesByLocation properties={properties} />
                  ) : (
                    <div className="mx-auto max-w-4xl space-y-4">
                      {properties.map((property, index) => (
                        <PropertyListItem key={property.id} property={property} index={index} />
                      ))}
                    </div>
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
