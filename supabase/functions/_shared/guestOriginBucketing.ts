/**
 * Free-text guest origin bucketing — no lat/lng/city column exists on guest_submissions today,
 * so this is a ranked list built from keyword matching, not a map.
 * Mirror on UI: none needed — server always returns the bucketed distribution.
 */

/** Ordered so more specific matches win before broader ones (e.g. a district before its city). */
const PH_LOCATION_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'Manila',
    keywords: [
      'manila',
      'quezon city',
      'qc',
      'makati',
      'taguig',
      'pasig',
      'mandaluyong',
      'paranaque',
      'parañaque',
      'pasay',
      'muntinlupa',
      'marikina',
      'caloocan',
      'malabon',
      'navotas',
      'valenzuela',
      'las pinas',
      'las piñas',
      'san juan',
      'metro manila',
      'ncr',
    ],
  },
  { label: 'Cebu', keywords: ['cebu', 'mandaue', 'lapu-lapu', 'lapu lapu', 'talisay city'] },
  { label: 'Davao', keywords: ['davao'] },
  { label: 'Iloilo', keywords: ['iloilo'] },
  { label: 'Baguio', keywords: ['baguio'] },
  { label: 'Bulacan', keywords: ['bulacan', 'malolos', 'san jose del monte'] },
  { label: 'Cavite', keywords: ['cavite', 'dasmarinas', 'dasmariñas', 'bacoor', 'imus'] },
  { label: 'Laguna', keywords: ['laguna', 'santa rosa', 'calamba', 'los banos', 'los baños'] },
  { label: 'Pampanga', keywords: ['pampanga', 'angeles city', 'clark'] },
  { label: 'Rizal', keywords: ['rizal', 'antipolo', 'cainta'] },
  { label: 'Batangas', keywords: ['batangas'] },
  { label: 'Zambales', keywords: ['zambales', 'subic'] },
  { label: 'Palawan', keywords: ['palawan', 'puerto princesa', 'el nido', 'coron'] },
  { label: 'Bacolod', keywords: ['bacolod', 'negros occidental'] },
  { label: 'Cagayan de Oro', keywords: ['cagayan de oro', 'cdo'] },
  { label: 'General Santos', keywords: ['general santos', 'gensan'] },
  { label: 'Zamboanga', keywords: ['zamboanga'] },
];

const COUNTRY_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: 'Philippines', keywords: ['philippines', 'pilipinas', 'ph'] },
  { label: 'United States', keywords: ['united states', 'usa', 'u.s.a', 'u.s.', 'america'] },
  { label: 'Canada', keywords: ['canada'] },
  { label: 'Australia', keywords: ['australia'] },
  { label: 'United Kingdom', keywords: ['united kingdom', 'uk', 'england', 'scotland', 'wales'] },
  { label: 'Japan', keywords: ['japan'] },
  { label: 'South Korea', keywords: ['south korea', 'korea'] },
  { label: 'Singapore', keywords: ['singapore'] },
  { label: 'China', keywords: ['china'] },
  { label: 'Saudi Arabia', keywords: ['saudi arabia', 'saudi'] },
  {
    label: 'United Arab Emirates',
    keywords: ['united arab emirates', 'uae', 'dubai', 'abu dhabi'],
  },
  { label: 'Qatar', keywords: ['qatar'] },
  { label: 'Germany', keywords: ['germany'] },
  { label: 'Italy', keywords: ['italy'] },
  { label: 'Spain', keywords: ['spain'] },
  { label: 'New Zealand', keywords: ['new zealand'] },
  { label: 'Malaysia', keywords: ['malaysia'] },
  { label: 'Hong Kong', keywords: ['hong kong'] },
  { label: 'Taiwan', keywords: ['taiwan'] },
];

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim();
}

function findLabel(
  haystack: string,
  table: Array<{ label: string; keywords: string[] }>
): string | null {
  for (const entry of table) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.label;
    }
  }
  return null;
}

/**
 * Buckets a guest's free-text address/nationality into a ranked-list-friendly label.
 * PH city/region match takes priority over country (most guests are domestic); falls back to
 * a matched country, then 'Unknown'. Never throws — always returns a usable bucket label.
 */
export function bucketGuestOrigin(
  guestAddress: string | null | undefined,
  nationality: string | null | undefined
): string {
  const address = normalize(guestAddress);
  const nation = normalize(nationality);
  const combined = `${address} ${nation}`.trim();
  if (!combined) return 'Unknown';

  const phMatch = findLabel(combined, PH_LOCATION_KEYWORDS);
  if (phMatch) return phMatch;

  const countryMatch = findLabel(combined, COUNTRY_KEYWORDS);
  if (countryMatch) return countryMatch;

  return 'Unknown';
}
