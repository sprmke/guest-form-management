const STORAGE_PREFIX = 'host-ann-banner-dismiss:v1';

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}:${orgId}`;
}

function readRaw(orgId: string | null): string[] {
  if (!orgId || typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(orgId)) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  } catch {
    return [];
  }
}

export function readDismissedHostAnnouncementBannerKeys(orgId: string | null): Set<string> {
  return new Set(readRaw(orgId));
}

export function dismissHostAnnouncementBanner(orgId: string, identityKey: string): void {
  if (typeof localStorage === 'undefined') return;
  const next = new Set(readRaw(orgId));
  next.add(identityKey);
  localStorage.setItem(storageKey(orgId), JSON.stringify([...next]));
}

/** Drop keys that no longer match any live announcement (housekeeping). */
export function pruneDismissedHostAnnouncementBannerKeys(
  orgId: string | null,
  activeIdentityKeys: readonly string[]
): void {
  if (!orgId || typeof localStorage === 'undefined') return;
  const active = new Set(activeIdentityKeys);
  const kept = readRaw(orgId).filter((key) => active.has(key));
  localStorage.setItem(storageKey(orgId), JSON.stringify(kept));
}
