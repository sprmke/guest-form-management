import { useEffect, useState } from 'react';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let loadPromise: Promise<void> | null = null;

function getMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
}

export function getGoogleMapsApiKey(): string {
  return getMapsApiKey();
}

function loadGoogleMaps(): Promise<void> {
  const apiKey = getMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
  }

  if (!loadPromise) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    loadPromise = Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('geocoding'),
    ]).then(() => undefined);
  }

  return loadPromise;
}

type UseGoogleMapsLoaderOptions = {
  /** When false, skip loading until re-enabled (e.g. first focus on a search field). */
  enabled?: boolean;
};

export function useGoogleMapsLoader(options: UseGoogleMapsLoaderOptions = {}) {
  const enabled = options.enabled !== false;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (!getMapsApiKey()) {
      return 'Add VITE_GOOGLE_MAPS_API_KEY to enable the map picker.';
    }
    return null;
  });

  useEffect(() => {
    if (!enabled || !getMapsApiKey()) return;

    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load Google Maps');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { ready, error, apiKeyConfigured: Boolean(getMapsApiKey()) };
}
