import type { ShowcaseData } from '@/features/guest/marketing/showcase/types/showcase';

export function formatShowcaseAddress(
  data: Pick<ShowcaseData, 'address' | 'city' | 'state' | 'country' | 'zipCode'>
): string {
  return [data.address, data.city, data.state, data.zipCode, data.country]
    .filter(Boolean)
    .join(', ');
}

export function formatShowcaseMapsLink(
  data: Pick<
    ShowcaseData,
    'latitude' | 'longitude' | 'address' | 'city' | 'state' | 'country' | 'zipCode' | 'mapsUrl'
  >
): string | null {
  if (data.mapsUrl?.trim()) return data.mapsUrl.trim();
  if (data.latitude != null && data.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
  }
  const full = formatShowcaseAddress(data);
  if (!full) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
}
