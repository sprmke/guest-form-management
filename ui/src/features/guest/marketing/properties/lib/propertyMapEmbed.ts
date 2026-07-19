export type PropertyMapEmbedInput = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  placeId?: string | null;
};

function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
}

function hasCoordinates(latitude?: number | null, longitude?: number | null): latitude is number {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  );
}

/** OpenStreetMap — light Mapnik tiles; no API key. */
export function buildOpenStreetMapEmbedSrc(latitude: number, longitude: number): string {
  const delta = 0.012;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

/** Legacy Google embed — works without Maps Embed API billing product. */
export function buildLegacyGoogleMapEmbedSrc(input: PropertyMapEmbedInput): string | null {
  const query = hasCoordinates(input.latitude, input.longitude)
    ? `${input.latitude},${input.longitude}`
    : input.address?.trim() || null;

  if (!query) return null;

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed&iwloc=near`;
}

/** Google Maps Embed API — use when `VITE_GOOGLE_MAPS_API_KEY` is set (enable Maps Embed API in Cloud Console). */
export function buildGoogleMapsEmbedApiSrc(
  input: PropertyMapEmbedInput,
  apiKey: string
): string | null {
  const key = apiKey.trim();
  if (!key) return null;

  const params = new URLSearchParams({ key });

  if (input.placeId?.trim()) {
    params.set('q', `place_id:${input.placeId.trim()}`);
  } else if (hasCoordinates(input.latitude, input.longitude)) {
    params.set('q', `${input.latitude},${input.longitude}`);
  } else if (input.address?.trim()) {
    params.set('q', input.address.trim());
  } else {
    return null;
  }

  params.set('zoom', '15');
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

export function resolvePropertyMapEmbedSrc(input: PropertyMapEmbedInput): string | null {
  const apiKey = getGoogleMapsApiKey();
  const fullAddress = input.address?.trim() || null;

  const withAddress: PropertyMapEmbedInput = {
    ...input,
    address: fullAddress ?? input.address,
  };

  if (apiKey) {
    const embedApi = buildGoogleMapsEmbedApiSrc(withAddress, apiKey);
    if (embedApi) return embedApi;
  }

  const legacyGoogle = buildLegacyGoogleMapEmbedSrc(withAddress);
  if (legacyGoogle) return legacyGoogle;

  if (hasCoordinates(input.latitude, input.longitude)) {
    return buildOpenStreetMapEmbedSrc(input.latitude, input.longitude);
  }

  return null;
}
