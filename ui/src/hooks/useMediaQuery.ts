import { useEffect, useState } from 'react';

/**
 * Subscribes to `window.matchMedia` and updates when the query result changes
 * (resize, orientation, devtools device toolbar) without a page refresh.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Matches Tailwind `lg` — below 1024px is treated as mobile/tablet bookings layout. */
export function useIsBelowLg(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}
