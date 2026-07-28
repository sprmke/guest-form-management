import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  Building2,
  Castle,
  Waves,
  Mountain,
  TreePine,
  Wifi,
  Car,
  UtensilsCrossed,
  Dumbbell,
  Wind,
  Tv,
  PawPrint,
  Sparkles,
  Layers,
} from 'lucide-react';

import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import { FilterSection } from '@/features/guest/marketing/shared/components/FilterSection';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PropertiesFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const propertyTypes = [
  { id: 'apartment', label: 'Apartment', icon: Building2 },
  { id: 'house', label: 'House', icon: Home },
  { id: 'villa', label: 'Villa', icon: Castle },
  { id: 'condo', label: 'Condo', icon: Building2 },
  { id: 'beach', label: 'Beachfront', icon: Waves },
  { id: 'mountain', label: 'Mountain', icon: Mountain },
  { id: 'cabin', label: 'Cabin', icon: TreePine },
];

const amenities = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'ac', label: 'Air Conditioning', icon: Wind },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'pets', label: 'Pet Friendly', icon: PawPrint },
  { id: 'pool', label: 'Pool', icon: Sparkles },
];

const priceRanges = [
  { id: 'budget', label: 'Budget', min: 0, max: 2000, display: '₱0 - ₱2,000' },
  { id: 'mid', label: 'Mid-range', min: 2000, max: 5000, display: '₱2,000 - ₱5,000' },
  { id: 'premium', label: 'Premium', min: 5000, max: 10000, display: '₱5,000 - ₱10,000' },
  { id: 'luxury', label: 'Luxury', min: 10000, max: null, display: '₱10,000+' },
];

const bedroomOptions = ['Any', '1', '2', '3', '4', '5+'];

const developmentFilterOptions = mockDevelopments.map((d) => ({
  id: d.slug,
  label: d.name,
  type: d.type,
}));

export function PropertiesFilters({ isOpen, onClose, isMobile = false }: PropertiesFiltersProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('Any');
  const [selectedDevelopments, setSelectedDevelopments] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    propertyType: true,
    price: true,
    bedrooms: true,
    amenities: true,
    development: false,
  });

  const toggleType = (id: string) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleDevelopment = (id: string) => {
    setSelectedDevelopments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedAmenities([]);
    setSelectedPriceRange(null);
    setSelectedBedrooms('Any');
    setSelectedDevelopments([]);
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedAmenities.length > 0 ||
    selectedPriceRange !== null ||
    selectedBedrooms !== 'Any' ||
    selectedDevelopments.length > 0;

  const activeFiltersCount =
    selectedTypes.length +
    selectedAmenities.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedBedrooms !== 'Any' ? 1 : 0) +
    selectedDevelopments.length;

  const filterContent = (
    <div className="space-y-6">
      {/* Property Type */}
      <FilterSection
        title="Property Type"
        expanded={expandedSections.propertyType ?? false}
        onToggle={() => toggleSection('propertyType')}
      >
        <div className="grid grid-cols-2 gap-2">
          {propertyTypes.map((type) => {
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
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection
        title="Price Range"
        subtitle="Per night"
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
              <span className="font-medium">{range.label}</span>
              <span className="text-muted-foreground">{range.display}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Bedrooms */}
      <FilterSection
        title="Bedrooms"
        expanded={expandedSections.bedrooms ?? false}
        onToggle={() => toggleSection('bedrooms')}
      >
        <div className="flex flex-wrap gap-2">
          {bedroomOptions.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedBedrooms(option)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                selectedBedrooms === option
                  ? 'bg-primary text-white'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted border'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Amenities */}
      <FilterSection
        title="Amenities"
        expanded={expandedSections.amenities ?? false}
        onToggle={() => toggleSection('amenities')}
      >
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((amenity) => {
            const Icon = amenity.icon;
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {amenity.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Development */}
      <FilterSection
        title="Development"
        subtitle="Filter by complex or community"
        expanded={expandedSections.development ?? false}
        onToggle={() => toggleSection('development')}
      >
        <div className="space-y-1.5">
          {developmentFilterOptions.map((dev) => {
            const isSelected = selectedDevelopments.includes(dev.id);
            return (
              <button
                key={dev.id}
                onClick={() => toggleDevelopment(dev.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1 flex-1">{dev.label}</span>
                {isSelected && <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  // Desktop Sidebar
  if (!isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-border bg-background hidden shrink-0 overflow-hidden border-r lg:block"
          >
            <div className="h-full w-[320px] overflow-y-auto p-6">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <p className="text-muted-foreground text-sm">
                      {activeFiltersCount} filter{activeFiltersCount !== 1 && 's'} applied
                    </p>
                  )}
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
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

  // Mobile Sheet
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-background fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl lg:hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
            </div>

            {/* Header */}
            <div className="border-border flex items-center justify-between border-b px-6 pb-4">
              <div>
                <h3 className="text-foreground text-lg font-semibold">Filters</h3>
                {activeFiltersCount > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 && 's'} applied
                  </p>
                )}
              </div>
              <button onClick={onClose} className="hover:bg-muted rounded-full p-2">
                <X className="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-6">{filterContent}</div>

            {/* Footer */}
            <div className="border-border border-t p-4">
              <div className="flex gap-3">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters} className="flex-1">
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
