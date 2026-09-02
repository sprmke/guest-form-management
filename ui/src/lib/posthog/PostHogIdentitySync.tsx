import { useEffect, useRef } from 'react';

import { isPostHogEnabled, posthog } from '@/lib/posthog/client';
import { supabase } from '@/lib/supabase/client';

/**
 * Ties PostHog events/replays/exceptions to the signed-in Supabase user (host
 * or guest — both share the same auth session) regardless of which route
 * guard mounted first. Mount once near the app root.
 */
export function PostHogIdentitySync() {
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPostHogEnabled) return;

    const identifySessionUser = (user: { id: string; email?: string } | null | undefined) => {
      if (!user || identifiedUserId.current === user.id) return;

      // A different session on a shared device must not inherit the prior user's identity.
      if (identifiedUserId.current) posthog.reset();

      posthog.identify(user.id, { email: user.email });
      identifiedUserId.current = user.id;
    };

    void supabase.auth.getSession().then(({ data }) => {
      identifySessionUser(data.session?.user);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset();
        identifiedUserId.current = null;
        return;
      }

      identifySessionUser(session?.user);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return null;
}
