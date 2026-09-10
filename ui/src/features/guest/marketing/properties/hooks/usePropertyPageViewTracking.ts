import { useEffect } from 'react';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SESSION_STORAGE_KEY = 'kh_pv_session_id';

function readOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // Private browsing / storage blocked — a fresh id per visit is a fine fallback.
    return crypto.randomUUID();
  }
}

function utmParam(name: string): string | undefined {
  try {
    return new URLSearchParams(window.location.search).get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fire-and-forget pageview beacon for the public property page — Host Analytics Phase 2b.
 * Never blocks render, never throws, no PII (session id is a random client-generated UUID).
 */
export function usePropertyPageViewTracking(propertyId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !propertyId || !FUNCTIONS_URL || !ANON_KEY) return;

    const payload = JSON.stringify({
      propertyId,
      sessionId: readOrCreateSessionId(),
      referrer: document.referrer || undefined,
      utmSource: utmParam('utm_source'),
      utmMedium: utmParam('utm_medium'),
      utmCampaign: utmParam('utm_campaign'),
    });

    const url = `${FUNCTIONS_URL}/property-page-view`;
    // sendBeacon can't set custom headers, so the (public, already client-bundled) anon key
    // travels as a query param instead of the usual apikey/Authorization headers — Supabase's
    // Kong gateway accepts either.
    const beaconUrl = `${url}?apikey=${encodeURIComponent(ANON_KEY)}`;

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(beaconUrl, blob);
        return;
      }
    } catch {
      // fall through to fetch
    }

    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        'content-type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: payload,
    }).catch(() => {
      // Best-effort — never surface a tracking failure to the guest.
    });
    // Only fire once per property mount, not on every referrer/param change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, enabled]);
}
