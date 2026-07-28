import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Home, Layers } from 'lucide-react';

import { FilterSection } from '@/features/guest/marketing/shared/components/FilterSection';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { DevelopmentType } from '../types';

interface DevelopmentsFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const developmentTypes: { id: DevelopmentType; label: string; icon: typeof Building2 }[] = [
  { id: 'CONDOMINIUM', label: 'Condominium', icon: Building2 },
  { id: 'SUBDIVISION', label: 'Subdivision', icon: Home },
  { id: 'MIXED_USE', label: 'Mixed-Use', icon: Layers },
  { id: 'TOWNHOUSE', label: 'Townhouse', icon: Home },
];

const cities = [
  'Metro Manila',
  'Taguig',
  'Makati',
  'Pasay',
  'San Fernando',
  'Sta. Rosa',
  'Cabuyao',
  'Tagaytay',
];

const priceRanges = [
  { id: 'budget', label: 'Under ₱3,000', min: 0, max: 3000 },
  { id: 'mid', label: '₱3,000 – ₱6,000', min: 3000, max: 6000 },
  { id: 'premium', label: '₱6,000 – ₱12,000', min: 6000, max: 12000 },
  { id: 'luxury', label: '₱12,000+', min: 12000, max: null },
];

const developerOptions = [
  'Ayala Land',
  'SM Prime',
  'Vista Land',
  'Century Properties',
  'Megaworld',
  'Robinsons Land',
];

export function DevelopmentsFilters({
  isOpen,
  onClose,
  isMobile = false,
}: DevelopmentsFiltersProps) {
  const [selectedTypes, setSelectedTypes] = useState<DevelopmentType[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    type: true,
    city: true,
    price: true,
    developer: false,
  });

  const toggleType = (id: DevelopmentType) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const toggleDeveloper = (dev: string) => {
    setSelectedDevelopers((prev) =>
      prev.includes(dev) ? prev.filter((d) => d !== dev) : [...prev, dev]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearAll = () => {
    setSelectedTypes([]);
    setSelectedCities([]);
    setSelectedPriceRange(null);
    setSelectedDevelopers([]);
  };

  const activeCount =
    selectedTypes.length +
    selectedCities.length +
    (selectedPriceRange ? 1 : 0) +
    selectedDevelopers.length;

  const filterContent = (
    <div className="space-y-6">
      {/* Development Type */}
      <FilterSection
        title="Development Type"
        expanded={expandedSections.type ?? false}
        onToggle={() => toggleSection('type')}
      >
        <div className="grid grid-cols-2 gap-2">
          {developmentTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{type.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* City / Location */}
      <FilterSection
        title="City / Location"
        expanded={expandedSections.city ?? false}
        onToggle={() => toggleSection('city')}
      >
        <div className="space-y-1.5">
          {cities.map((city) => {
            const isSelected = selectedCities.includes(city);
            return (
              <button
                key={city}
                onClick={() => toggleCity(city)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <span>{city}</span>
                {isSelected && <span className="bg-primary ml-2 h-2 w-2 rounded-full" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection
        title="Price Range"
        subtitle="Per night (starting from)"
        expanded={expandedSections.price ?? false}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-2">
          {priceRanges.map((range) => (
            <button
              key={range.id}
              onClick={() =>
                setSelectedPriceRange(selectedPriceRange === range.id ? null : range.id)
              }
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-all',
                selectedPriceRange === range.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Developer */}
      <FilterSection
        title="Developer"
        expanded={expandedSections.developer ?? false}
        onToggle={() => toggleSection('developer')}
      >
        <div className="space-y-1.5">
          {developerOptions.map((dev) => {
            const isSelected = selectedDevelopers.includes(dev);
            return (
              <button
                key={dev}
                onClick={() => toggleDeveloper(dev)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <span>{dev}</span>
                {isSelected && <span className="bg-primary ml-2 h-2 w-2 rounded-full" />}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  // Desktop sidebar
  if (!isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-border bg-background hidden shrink-0 overflow-hidden border-r lg:block"
          >
            <div className="h-full w-[300px] overflow-y-auto p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Filters</h3>
                  {activeCount > 0 && (
                    <p className="text-muted-foreground text-sm">
                      {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
                    </p>
                  )}
                </div>
                {activeCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
              </div>
              {filterContent}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    );
  }

  // Mobile sheet
  return (
    <AnimatePresence>
      {isOpen && (
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
                {activeCount > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
                  </p>
                )}
              </div>
              <button onClick={onClose} className="hover:bg-muted rounded-full p-2">
                <X className="text-muted-foreground h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">{filterContent}</div>
            <div className="border-border border-t p-4">
              <div className="flex gap-3">
                {activeCount > 0 && (
                  <Button variant="outline" onClick={clearAll} className="flex-1">
                    Clear all
                  </Button>
                )}
                <Button onClick={onClose} className="flex-1">
                  Show results
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
