import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  DevelopmentsFilters,
  DevelopmentsHero,
  DevelopmentsToolbar,
  type DevelopmentViewMode,
} from '@/features/guest/marketing/developments/components';
import { usePublicDevelopments } from '@/features/guest/marketing/developments/hooks/usePublicDevelopments';
import {
  DEFAULT_DEVELOPMENTS_QUERY,
  EMPTY_DEVELOPMENTS_FACETS,
  toDevelopmentCard,
  type DevelopmentsSort,
} from '@/features/guest/marketing/developments/lib/developmentsQuery';
import { PropertiesByDevelopment } from '@/features/guest/marketing/properties/components/PropertiesByDevelopment';
import type { Property } from '@/features/guest/marketing/properties/components/PropertyCard';
import { PropertyListItem } from '@/features/guest/marketing/properties/components/PropertyListItem';
import { usePublicProperties } from '@/features/guest/marketing/properties/hooks/usePublicProperties';
import {
  groupPropertiesByDevelopment,
  propertiesForDevelopment,
} from '@/features/guest/marketing/properties/lib/groupPropertiesByDevelopment';
import {
  DEFAULT_PROPERTIES_QUERY,
  type PublicPropertyListItem,
} from '@/features/guest/marketing/properties/lib/propertiesQuery';
import { normalizeCityPlace } from '@/features/guest/marketing/shared/lib/locationSlug';
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

export function DevelopmentsLocationPage() {
  const { location = '' } = useParams<{ location: string }>();
  const locationSlug = location.trim().toLowerCase();
  const reduceMotion = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DevelopmentViewMode>('grid');
  const [sortBy, setSortBy] = useState<DevelopmentsSort>('recommended');
  const [filterQuery, setFilterQuery] = useState({
    ...DEFAULT_DEVELOPMENTS_QUERY,
    locationSlug,
  });

  const developmentsQuery = useMemo(
    () => ({
      ...filterQuery,
      locationSlug,
      sort: sortBy,
      page: 1,
      pageSize: filterQuery.pageSize || 48,
    }),
    [filterQuery, locationSlug, sortBy]
  );

  const propertiesQuery = useMemo(
    () => ({
      ...DEFAULT_PROPERTIES_QUERY,
      locationSlug,
      page: 1,
      pageSize: 48,
    }),
    [locationSlug]
  );

  const developmentsResult = usePublicDevelopments(developmentsQuery, Boolean(locationSlug));
  const propertiesResult = usePublicProperties(propertiesQuery, Boolean(locationSlug));

  const developments = useMemo(
    () => (developmentsResult.data?.data ?? []).map(toDevelopmentCard),
    [developmentsResult.data?.data]
  );
  const properties = useMemo(
    () => (propertiesResult.data?.data ?? []).map(toPropertyCard),
    [propertiesResult.data?.data]
  );

  const city =
    developments[0] != null
      ? normalizeCityPlace(developments[0].city)
      : properties[0] != null
        ? normalizeCityPlace(properties[0].location.split(',')[0] ?? '')
        : null;

  const sortedDevelopments = useMemo(() => {
    const sorted = [...developments];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => (b.established ?? 0) - (a.established ?? 0));
      default:
        return sorted;
    }
  }, [developments, sortBy]);

  const locationProperties = useMemo(() => {
    const seen = new Set<string>();
    const all: Property[] = [];
    for (const development of sortedDevelopments) {
      for (const property of propertiesForDevelopment(development, properties)) {
        if (seen.has(property.id)) continue;
        seen.add(property.id);
        all.push(property);
      }
    }
    if (all.length > 0) return all;
    return properties;
  }, [sortedDevelopments, properties]);

  const sortedFlatProperties = useMemo(() => {
    const sorted = [...locationProperties];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:
        return sorted;
    }
  }, [locationProperties, sortBy]);

  const propertyCount = useMemo(
    () =>
      groupPropertiesByDevelopment(sortedDevelopments, properties).reduce(
        (sum, g) => sum + g.properties.length,
        0
      ) || properties.length,
    [sortedDevelopments, properties]
  );

  const isLoading = developmentsResult.isLoading || propertiesResult.isLoading;
  const isError = developmentsResult.isError || propertiesResult.isError;
  const totalDevelopments = developmentsResult.data?.total ?? 0;
  const totalProperties = propertiesResult.data?.total ?? 0;

  if (!locationSlug) {
    return <Navigate to="/developments" replace />;
  }

  if (!isLoading && !isError && totalDevelopments === 0 && totalProperties === 0) {
    return <Navigate to="/developments" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <DevelopmentsHero />

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
        <DevelopmentsFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
          value={filterQuery}
          onChange={(next) => setFilterQuery({ ...next, locationSlug })}
          facets={developmentsResult.data?.facets ?? EMPTY_DEVELOPMENTS_FACETS}
        />

        <DevelopmentsFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
          value={filterQuery}
          onChange={(next) => setFilterQuery({ ...next, locationSlug })}
          facets={developmentsResult.data?.facets ?? EMPTY_DEVELOPMENTS_FACETS}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <DevelopmentsToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={(next) => setSortBy(next as DevelopmentsSort)}
            totalResults={propertyCount}
            resultsNoun="property"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <h1 className="text-foreground px-4 pt-4 text-lg font-semibold tracking-tight sm:px-6 sm:pt-5 sm:text-xl">
            Developments in {city ?? '…'}
          </h1>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16" role="alert">
              <p className="text-muted-foreground text-sm">Could not load developments.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => {
                  void developmentsResult.refetch();
                  void propertiesResult.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-muted-foreground px-4 py-16 text-sm sm:px-6">Loading…</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${locationSlug}-${viewMode}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="min-w-0 p-4 sm:p-6"
              >
                {viewMode === 'grid' ? (
                  <PropertiesByDevelopment
                    developments={sortedDevelopments}
                    properties={properties}
                  />
                ) : (
                  <div className="mx-auto max-w-4xl space-y-4">
                    {sortedFlatProperties.map((property, index) => (
                      <PropertyListItem key={property.id} property={property} index={index} />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
