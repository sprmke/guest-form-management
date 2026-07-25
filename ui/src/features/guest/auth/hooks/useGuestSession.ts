import { useEffect, useMemo, useState } from 'react';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';

export type GuestSessionStatus = 'loading' | 'anonymous' | 'authenticated';

export function useGuestSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[useGuestSession] getSession failed', err);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const email = session?.user?.email?.toLowerCase() ?? null;

  const status: GuestSessionStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (!session) return 'anonymous';
    return 'authenticated';
  }, [isLoading, session]);

  return { status, session, email, isLoading };
}
