import { ListingMapView } from '@/features/guest/marketing/shared/components/ListingMapView';
import {
  markersFromCoords,
  type MapBbox,
} from '@/features/guest/marketing/shared/lib/listingMapMarkers';

import type { Development } from '../types';

interface DevelopmentsMapProps {
  developments: Development[];
  totalInView?: number;
  onViewportChange?: (bbox: MapBbox) => void;
}

export function DevelopmentsMap({
  developments,
  totalInView,
  onViewportChange,
}: DevelopmentsMapProps) {
  const markers = markersFromCoords(developments, (row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    price: row.priceRange.min > 0 ? row.priceRange.min : null,
    rating: row.rating ?? null,
    images: row.images,
    href: `/developments/${row.slug}`,
    family: 'development' as const,
  }));

  return (
    <ListingMapView
      markers={markers}
      totalInView={totalInView ?? developments.length}
      nounSingular="development"
      nounPlural="developments"
      onViewportChange={onViewportChange}
    />
  );
}
