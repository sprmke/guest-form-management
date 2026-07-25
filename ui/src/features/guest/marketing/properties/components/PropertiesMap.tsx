import { useState } from 'react';

import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import type { Property } from './PropertyCard';

interface PropertiesMapProps {
  properties: Property[];
}

// Mock coordinates for properties (in real app, these would come from API)
const mockCoordinates: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 11.967, lng: 121.924 },
  '2': { lat: 14.554, lng: 121.024 },
  '3': { lat: 14.108, lng: 120.957 },
  '4': { lat: 10.315, lng: 123.891 },
  '5': { lat: 9.838, lng: 118.728 },
  '6': { lat: 16.413, lng: 120.599 },
};

export function PropertiesMap({ properties }: PropertiesMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  return (
    <div className="border-border bg-muted relative h-full w-full overflow-hidden rounded-2xl border">
      {/* Map Placeholder - In production, use Mapbox or Google Maps */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900">
        {/* Grid pattern for visual interest */}
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-primary/20"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>

        {/* Decorative water */}
        <div className="absolute bottom-0 left-0 h-1/3 w-1/2 rounded-tr-full bg-blue-200/50 dark:bg-blue-900/30" />
        <div className="absolute right-0 top-1/4 h-1/4 w-1/3 rounded-l-full bg-blue-200/50 dark:bg-blue-900/30" />
      </div>

      {/* Property Markers */}
      <div className="absolute inset-0">
        {properties.map((property, index) => {
          const coords = mockCoordinates[property.id] || {
            lat: 12 + Math.random() * 5,
            lng: 120 + Math.random() * 5,
          };
          // Convert to percentage positions (simplified mapping)
          const left = ((coords.lng - 118) / 10) * 100;
          const top = ((16 - coords.lat) / 8) * 100;

          return (
            <motion.button
              key={property.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              style={{
                left: `${Math.max(5, Math.min(95, left))}%`,
                top: `${Math.max(5, Math.min(95, top))}%`,
              }}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
                'z-10',
                (hoveredMarker === property.id || selectedProperty?.id === property.id) && 'z-20'
              )}
              onMouseEnter={() => setHoveredMarker(property.id)}
              onMouseLeave={() => setHoveredMarker(null)}
              onClick={() => setSelectedProperty(property)}
            >
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold shadow-lg transition-all',
                  selectedProperty?.id === property.id
                    ? 'bg-primary scale-110 text-white'
                    : hoveredMarker === property.id
                      ? 'bg-foreground text-background scale-105'
                      : 'bg-background text-foreground hover:scale-105'
                )}
              >
                <span className="text-sm">₱{(property.price / 1000).toFixed(0)}k</span>
              </div>
              {/* Pin tail */}
              <div
                className={cn(
                  'mx-auto h-2 w-2 -translate-y-1 rotate-45',
                  selectedProperty?.id === property.id
                    ? 'bg-primary'
                    : hoveredMarker === property.id
                      ? 'bg-foreground'
                      : 'bg-background'
                )}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Selected Property Card */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 z-30 sm:left-auto sm:right-4 sm:w-80"
          >
            <MapPropertyCard
              property={selectedProperty}
              onClose={() => setSelectedProperty(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Legend */}
      <div className="border-border bg-background/95 absolute left-4 top-4 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="text-primary h-4 w-4" />
          <span className="text-foreground font-medium">{properties.length} properties</span>
        </div>
      </div>

      {/* Zoom Controls (decorative) */}
      <div className="border-border bg-background absolute right-4 top-4 flex flex-col gap-1 rounded-lg border shadow-lg">
        <button className="text-foreground hover:bg-muted px-3 py-2 text-lg font-medium">+</button>
        <div className="bg-border h-px" />
        <button className="text-foreground hover:bg-muted px-3 py-2 text-lg font-medium">−</button>
      </div>
    </div>
  );
}

function MapPropertyCard({ property, onClose }: { property: Property; onClose: () => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xl">
      {/* Image */}
      <div className="relative aspect-[16/10]">
        <Image
          src={property.images[currentImageIndex] ?? ''}
          alt={property.name}
          fill
          className="object-cover"
        />
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-white"
        >
          <X className="h-4 w-4 text-slate-900" />
        </button>

        {/* Image Navigation */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentImageIndex(
                  currentImageIndex === 0 ? property.images.length - 1 : currentImageIndex - 1
                )
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow-lg backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4 text-slate-900" />
            </button>
            <button
              onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow-lg backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4 text-slate-900" />
            </button>
          </>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex gap-1">
          {property.isSuperhost && (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              Superhost
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <Link to={`/properties/${property.id}` as any} className="block p-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h4 className="text-foreground line-clamp-1 font-semibold">{property.name}</h4>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{property.rating}</span>
          </div>
        </div>
        <p className="text-muted-foreground mb-2 text-sm">{property.location}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-foreground font-bold">₱{property.price.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm"> / night</span>
          </div>
          <span className="text-primary text-xs font-medium">View →</span>
        </div>
      </Link>
    </div>
  );
}
