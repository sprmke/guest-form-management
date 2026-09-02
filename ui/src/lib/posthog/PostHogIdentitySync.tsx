import { useEffect } from 'react';

import { isPostHogEnabled, posthog } from '@/lib/posthog/client';
import { supabase } from '@/lib/supabase/client';

/**
 * Ties PostHog events/replays/exceptions to the signed-in Supabase user (host
 * or guest — both share the same auth session) regardless of which route
 * guard mounted first. Mount once near the app root.
 */
export function PostHogIdentitySync() {
  useEffect(() => {
    if (!isPostHogEnabled) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) posthog.identify(user.id, { email: user.email });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset();
        return;
      }
      const user = session?.user;
      if (user) posthog.identify(user.id, { email: user.email });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return null;
}
