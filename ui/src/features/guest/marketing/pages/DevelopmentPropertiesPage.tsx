import { useMemo, useState } from 'react';

import { Navigate, Link, useParams } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';
import { Car, SlidersHorizontal } from 'lucide-react';

import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import { getParkingSlotsByDevelopmentSlug } from '@/features/guest/marketing/developments/data/mockParkingSlots';
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
import { propertiesForDevelopment } from '@/features/guest/marketing/properties/lib/groupPropertiesByDevelopment';

import { Button } from '@/components/ui/button';

export function DevelopmentPropertiesPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const development = mockDevelopments.find((d) => d.slug === slug);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('recommended');

  const developmentProperties = useMemo(() => {
    if (!development) return [];
    return propertiesForDevelopment(development, mockProperties);
  }, [development]);

  const sortedProperties = useMemo(() => {
    const sorted = [...developmentProperties];
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
  }, [developmentProperties, sortBy]);

  const hasParking = getParkingSlotsByDevelopmentSlug(slug).length > 0;

  if (!development) {
    return <Navigate to="/developments" replace />;
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

          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
            <h1 className="text-foreground min-w-0 text-lg font-semibold tracking-tight sm:text-xl">
              Homes in {development.name}
            </h1>
            {hasParking ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border hover:bg-muted min-h-[44px] shrink-0 gap-1.5 rounded-xl sm:gap-2"
              >
                <Link to={`/developments/${development.slug}/parking`}>
                  <Car className="h-4 w-4" aria-hidden />
                  View Parking
                </Link>
              </Button>
            ) : null}
          </div>

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
                key={`${slug}-${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 p-4 sm:p-6"
              >
                {sortedProperties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <p className="text-muted-foreground">
                      No homes match your search criteria. Try adjusting your filters.
                    </p>
                  </div>
                ) : viewMode === 'grid' ? (
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
