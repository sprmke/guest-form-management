import { useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  DevelopmentsFilters,
  DevelopmentsHero,
  DevelopmentsToolbar,
  type DevelopmentViewMode,
} from '@/features/guest/marketing/developments/components';
import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import {
  filterDevelopmentsByLocationSlug,
  findCityByLocationSlug,
} from '@/features/guest/marketing/developments/lib/groupDevelopmentsByLocation';
import { PropertiesByDevelopment } from '@/features/guest/marketing/properties/components/PropertiesByDevelopment';
import { PropertyListItem } from '@/features/guest/marketing/properties/components/PropertyListItem';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import {
  groupPropertiesByDevelopment,
  propertiesForDevelopment,
} from '@/features/guest/marketing/properties/lib/groupPropertiesByDevelopment';

import { Button } from '@/components/ui/button';

export function DevelopmentsLocationPage() {
  const { location = '' } = useParams<{ location: string }>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DevelopmentViewMode>('grid');
  const [sortBy, setSortBy] = useState('recommended');

  const city = findCityByLocationSlug(location, mockDevelopments);

  const locationDevelopments = useMemo(
    () => filterDevelopmentsByLocationSlug(mockDevelopments, location),
    [location]
  );

  const sortedDevelopments = useMemo(() => {
    const sorted = [...locationDevelopments];
    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'price-low':
        return sorted.sort((a, b) => a.priceRange.min - b.priceRange.min);
      case 'price-high':
        return sorted.sort((a, b) => b.priceRange.min - a.priceRange.min);
      case 'newest':
        return sorted.sort((a, b) => (b.established ?? 0) - (a.established ?? 0));
      default:
        return sorted;
    }
  }, [locationDevelopments, sortBy]);

  const locationProperties = useMemo(() => {
    const seen = new Set<string>();
    const all: typeof mockProperties = [];
    for (const development of sortedDevelopments) {
      for (const property of propertiesForDevelopment(development, mockProperties)) {
        if (seen.has(property.id)) continue;
        seen.add(property.id);
        all.push(property);
      }
    }
    return all;
  }, [sortedDevelopments]);

  const sortedFlatProperties = useMemo(() => {
    const sorted = [...locationProperties];
    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'newest':
        return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:
        return sorted;
    }
  }, [locationProperties, sortBy]);

  const propertyCount = useMemo(
    () =>
      groupPropertiesByDevelopment(sortedDevelopments, mockProperties).reduce(
        (sum, g) => sum + g.properties.length,
        0
      ),
    [sortedDevelopments]
  );

  if (!city) {
    return <Navigate to="/developments" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <DevelopmentsHero />

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

      <div className="flex min-w-0">
        <DevelopmentsFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          isMobile={false}
        />

        <DevelopmentsFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          isMobile={true}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <DevelopmentsToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalResults={propertyCount}
            resultsNoun="property"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${location}-${viewMode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 p-4 sm:p-6"
            >
              {viewMode === 'grid' ? (
                <PropertiesByDevelopment
                  developments={sortedDevelopments}
                  properties={mockProperties}
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
        </main>
      </div>
    </div>
  );
}
