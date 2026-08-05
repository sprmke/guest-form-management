import { ListingMapView } from '@/features/guest/marketing/shared/components/ListingMapView';
import {
  markersFromCoords,
  type MapBbox,
} from '@/features/guest/marketing/shared/lib/listingMapMarkers';

import type { Property } from './PropertyCard';

interface PropertiesMapProps {
  properties: Property[];
  totalInView?: number;
  onViewportChange?: (bbox: MapBbox) => void;
}

export function PropertiesMap({ properties, totalInView, onViewportChange }: PropertiesMapProps) {
  const markers = markersFromCoords(properties, (row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    price: row.price,
    rating: row.rating,
    images: row.images,
    href: `/properties/${row.slug}`,
    family: 'property' as const,
  }));

  return (
    <ListingMapView
      markers={markers}
      totalInView={totalInView ?? properties.length}
      nounSingular="property"
      nounPlural="properties"
      onViewportChange={onViewportChange}
    />
  );
}
