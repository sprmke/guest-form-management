import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  PropertiesFilters,
  PropertiesHero,
  PropertiesMap,
  PropertiesToolbar,
  PropertyCard,
  PropertyListItem,
  type ViewMode,
} from '@/features/guest/marketing/properties/components';
import type { Property } from '@/features/guest/marketing/properties/components/PropertyCard';
import { usePublicProperties } from '@/features/guest/marketing/properties/hooks/usePublicProperties';
import { placeLabelFromPropertyLocation } from '@/features/guest/marketing/properties/lib/groupPropertiesByLocation';
import {
  DEFAULT_PROPERTIES_QUERY,
  EMPTY_PROPERTIES_FACETS,
  type PropertiesListingQuery,
  type PropertiesSort,
  type PublicPropertyListItem,
} from '@/features/guest/marketing/properties/lib/propertiesQuery';
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

export function PropertiesLocationPage() {
  const { location = '' } = useParams<{ location: string }>();
  const locationSlug = location.trim().toLowerCase();
  const reduceMotion = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<PropertiesSort>('recommended');
  const [page, setPage] = useState(1);
  const [filterQuery, setFilterQuery] = useState<PropertiesListingQuery>({
    ...DEFAULT_PROPERTIES_QUERY,
    locationSlug,
  });

  const listingQuery = useMemo(
    () => ({
      ...filterQuery,
      locationSlug,
      sort: sortBy,
      page,
      pageSize: filterQuery.pageSize || 24,
    }),
    [filterQuery, locationSlug, sortBy, page]
  );

  const { data, isLoading, isError, isFetching, refetch } = usePublicProperties(
    listingQuery,
    Boolean(locationSlug)
  );

  const properties = useMemo(() => (data?.data ?? []).map(toPropertyCard), [data?.data]);
  const place =
    properties[0] != null
      ? placeLabelFromPropertyLocation(properties[0].location)
      : locationSlug
        ? locationSlug
            .split('-')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : null;
  const totalResults = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 24;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize) || 1);

  if (!locationSlug) {
    return <Navigate to="/properties" replace />;
  }

  if (!isLoading && !isError && totalResults === 0) {
    return <Navigate to="/properties" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <PropertiesHero />

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
        <PropertiesFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
          value={filterQuery}
          onChange={(next) => {
            setFilterQuery({ ...next, locationSlug });
            setPage(1);
          }}
          facets={data?.facets ?? EMPTY_PROPERTIES_FACETS}
        />

        <PropertiesFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
          value={filterQuery}
          onChange={(next) => {
            setFilterQuery({ ...next, locationSlug });
            setPage(1);
          }}
          facets={data?.facets ?? EMPTY_PROPERTIES_FACETS}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <PropertiesToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={(next) => {
              setSortBy(next as PropertiesSort);
              setPage(1);
            }}
            totalResults={totalResults}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <h1 className="text-foreground px-4 pt-4 text-lg font-semibold tracking-tight sm:px-6 sm:pt-5 sm:text-xl">
            Homes in {place}
          </h1>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16" role="alert">
              <p className="text-muted-foreground text-sm">Could not load homes.</p>
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
            <div className="text-muted-foreground px-4 py-16 text-sm sm:px-6">Loading…</div>
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
                  <PropertiesMap properties={properties} />
                </motion.div>
              ) : (
                <motion.div
                  key={`${locationSlug}-${viewMode}-${page}`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: isFetching ? 0.7 : 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="min-w-0 space-y-6 p-4 sm:p-6"
                >
                  {viewMode === 'grid' ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {properties.map((property, index) => (
                        <PropertyCard key={property.id} property={property} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="mx-auto max-w-4xl space-y-4">
                      {properties.map((property, index) => (
                        <PropertyListItem key={property.id} property={property} index={index} />
                      ))}
                    </div>
                  )}
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
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
