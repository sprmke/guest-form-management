import { useMemo, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

import {
  DevelopmentsHero,
  DevelopmentsFilters,
  DevelopmentsToolbar,
  DevelopmentsGrid,
  DevelopmentsByLocation,
  type DevelopmentViewMode,
} from '@/features/guest/marketing/developments/components';
import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';

import { Button } from '@/components/ui/button';

export function DevelopmentsListPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DevelopmentViewMode>('grid');
  const [sortBy, setSortBy] = useState('recommended');

  const sortedDevelopments = useMemo(() => {
    const sorted = [...mockDevelopments];
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
  }, [sortBy]);

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
            totalResults={sortedDevelopments.length}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 p-4 sm:p-6"
            >
              {viewMode === 'grid' ? (
                <DevelopmentsByLocation developments={sortedDevelopments} />
              ) : (
                <DevelopmentsGrid developments={sortedDevelopments} viewMode={viewMode} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
