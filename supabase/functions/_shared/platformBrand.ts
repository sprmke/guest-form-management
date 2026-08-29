/** Platform product brand — not a specific host org or residence. */
export const PLATFORM_BRAND_NAME = 'Kame Homes';

/** True when a label is the old single-tenant brand (optionally with Azure North). */
export function isLegacyKameHomeBrand(label: string | null | undefined): boolean {
  const value = label?.trim() ?? '';
  if (!value) return false;
  // "Kame Home", "KameHome", "Kame Home — Azure North", "Kame Home - Azure North Residences"
  return /^kame\s*home(?:\s*[—\-–]\s*azure\s*north(?:\s+residences?)?)?$/i.test(value);
}

/**
 * Host org label for email/public chrome.
 * Maps legacy single-tenant labels to the platform brand; returns null when unset.
 */
export function resolvePublicBrandName(organizationName: string | null | undefined): string | null {
  const org = organizationName?.trim();
  if (!org) return null;
  if (isLegacyKameHomeBrand(org)) return PLATFORM_BRAND_NAME;
  return org;
}
