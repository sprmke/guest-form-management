import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';
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
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import {
  filterPropertiesByLocationSlug,
  findPlaceByLocationSlug,
} from '@/features/guest/marketing/properties/lib/groupPropertiesByLocation';

import { Button } from '@/components/ui/button';

export function PropertiesLocationPage() {
  const { location = '' } = useParams<{ location: string }>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('recommended');

  const place = findPlaceByLocationSlug(location, mockProperties);

  const locationProperties = useMemo(
    () => filterPropertiesByLocationSlug(mockProperties, location),
    [location]
  );

  const sortedProperties = useMemo(() => {
    const sorted = [...locationProperties];
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'reviews':
        return sorted.sort((a, b) => b.reviews - a.reviews);
      case 'newest':
        return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:
        return sorted;
    }
  }, [locationProperties, sortBy]);

  if (!place) {
    return <Navigate to="/properties" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <PropertiesHero />

      <div className="border-border bg-background/95 sticky top-16 z-30 border-b p-4 backdrop-blur-sm lg:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileFiltersOpen(true)}
          className="w-full gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters & Sort
        </Button>
      </div>

      <div className="flex">
        <PropertiesFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
        />

        <PropertiesFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <PropertiesToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalResults={sortedProperties.length}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <h1 className="text-foreground px-4 pt-4 text-lg font-semibold tracking-tight sm:px-6 sm:pt-5 sm:text-xl">
            Homes in {place}
          </h1>

          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-200px)] p-4"
              >
                <PropertiesMap properties={sortedProperties} />
              </motion.div>
            ) : (
              <motion.div
                key={`${location}-${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 p-4 sm:p-6"
              >
                {viewMode === 'grid' ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {sortedProperties.map((property, index) => (
                      <PropertyCard key={property.id} property={property} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl space-y-4">
                    {sortedProperties.map((property, index) => (
                      <PropertyListItem key={property.id} property={property} index={index} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
