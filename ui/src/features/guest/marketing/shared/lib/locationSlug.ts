/** Strip trailing " City" for city-based families (developments / parkings). */
export function normalizeCityPlace(value: string | null | undefined): string {
  const place = (value ?? '')
    .trim()
    .replace(/\s+City$/i, '')
    .trim();
  return place || 'Other';
}

/** Slugify a city / place name for location routes (e.g. "Sta. Rosa" → "sta-rosa"). */
export function toLocationSlug(place: string): string {
  return (
    place
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'other'
  );
}
