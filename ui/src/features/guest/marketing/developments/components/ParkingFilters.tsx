import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Car, Layers, X } from 'lucide-react';

import { FilterSection } from '@/features/guest/marketing/shared/components/FilterSection';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  countActiveParkingFilters,
  DEFAULT_PARKING_FILTERS,
  PARKING_LOCATION_OPTIONS,
  PARKING_PRICE_RANGE_OPTIONS,
  showsTowerFilter,
  type ParkingFilterState,
  type ParkingLocationFilter,
} from '../lib/parkingSlotFilters';

interface ParkingFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  filters: ParkingFilterState;
  onFiltersChange: (filters: ParkingFilterState) => void;
  insideTowerOptions: string[];
}

const LOCATION_ICONS: Record<ParkingLocationFilter, typeof Building2> = {
  inside_tower: Building2,
  outside_tower: Car,
};

export function ParkingFilters({
  isOpen,
  onClose,
  isMobile = false,
  filters,
  onFiltersChange,
  insideTowerOptions,
}: ParkingFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    location: true,
    tower: true,
    price: true,
  });

  const showTowerSection = showsTowerFilter(filters);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleLocation = (id: ParkingLocationFilter) => {
    const locations = filters.locations.includes(id)
      ? filters.locations.filter((loc) => loc !== id)
      : [...filters.locations, id];

    const next: ParkingFilterState = { ...filters, locations };

    if (!locations.includes('inside_tower')) {
      next.towers = [];
    }

    onFiltersChange(next);
  };

  const toggleTower = (tower: string) => {
    const towers = filters.towers.includes(tower)
      ? filters.towers.filter((t) => t !== tower)
      : [...filters.towers, tower];
    onFiltersChange({ ...filters, towers });
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_PARKING_FILTERS);
  };

  const activeFiltersCount = countActiveParkingFilters(filters);
  const hasActiveFilters = activeFiltersCount > 0;

  const filterContent = (
    <div className="space-y-6">
      <FilterSection
        title="Location"
        expanded={expandedSections.location ?? false}
        onToggle={() => toggleSection('location')}
      >
        <div className="grid grid-cols-1 gap-2">
          {PARKING_LOCATION_OPTIONS.map((option) => {
            const Icon = LOCATION_ICONS[option.id];
            const isSelected = filters.locations.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleLocation(option.id)}
                className={cn(
                  'flex min-h-[44px] items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {showTowerSection && insideTowerOptions.length > 0 ? (
        <FilterSection
          title="Tower"
          expanded={expandedSections.tower ?? false}
          onToggle={() => toggleSection('tower')}
        >
          <div className="space-y-1.5">
            {insideTowerOptions.map((tower) => {
              const isSelected = filters.towers.includes(tower);
              return (
                <button
                  key={tower}
                  type="button"
                  onClick={() => toggleTower(tower)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                  )}
                >
                  <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="line-clamp-1 flex-1">{tower}</span>
                  {isSelected ? (
                    <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection
        title="Price Range"
        subtitle="Per night"
        expanded={expandedSections.price ?? false}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-2">
          {PARKING_PRICE_RANGE_OPTIONS.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  priceRange: filters.priceRange === range.id ? null : range.id,
                })
              }
              className={cn(
                'flex min-h-[44px] w-full items-center justify-between rounded-lg border p-3 text-sm transition-all',
                filters.priceRange === range.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
              )}
            >
              <span className="font-medium">{range.label}</span>
              <span className="text-muted-foreground">{range.display}</span>
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  if (!isMobile) {
    return (
      <AnimatePresence>
        {isOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-border bg-background hidden shrink-0 overflow-hidden border-r lg:block"
          >
            <div className="h-full w-[320px] overflow-y-auto p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Filters</h3>
                  {activeFiltersCount > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {activeFiltersCount} filter{activeFiltersCount !== 1 && 's'} applied
                    </p>
                  ) : null}
                </div>
                {hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                ) : null}
              </div>
              {filterContent}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-background fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl lg:hidden"
          >
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
            </div>
            <div className="border-border flex items-center justify-between border-b px-6 pb-4">
              <div>
                <h3 className="text-foreground text-lg font-semibold">Filters</h3>
                {activeFiltersCount > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 && 's'} applied
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hover:bg-muted min-h-[44px] min-w-[44px] rounded-full p-2"
                aria-label="Close filters"
              >
                <X className="text-muted-foreground h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">{filterContent}</div>
            <div className="border-border border-t p-4">
              <div className="flex gap-3">
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="min-h-[44px] flex-1"
                  >
                    Clear all
                  </Button>
                ) : null}
                <Button onClick={onClose} className="min-h-[44px] flex-1">
                  Show results
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
