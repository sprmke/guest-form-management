import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { ADMIN_ALLOWED_EMAILS, isAdminEmail } from '@/features/admin/lib/adminConfig';

export type AdminSessionState = {
  status: 'loading' | 'signed-out' | 'not-admin' | 'admin';
  session: Session | null;
  email: string | null;
  /** True while we're resolving the initial session from storage. */
  isLoading: boolean;
  /** Signs the current user out (used when an email is not in the allow list). */
  signOut: () => Promise<void>;
  /** Raw allow list exposed for UX copy (e.g. "authorized emails: …" in error states). */
  allowedEmails: ReadonlyArray<string>;
};

/**
 * Hook for admin session + allow-list enforcement. This is a UX gate only — the
 * authoritative allow list lives server-side (see `.cursor/rules/admin-auth.mdc`).
 *
 * Emits four possible states once loading settles:
 * - `signed-out`  → redirect to /sign-in
 * - `not-admin`   → show "Not authorized" and offer sign-out
 * - `admin`       → render admin UI
 */
export function useAdminSession(): AdminSessionState {
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
        console.error('[useAdminSession] getSession failed', err);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const email = session?.user?.email?.toLowerCase() ?? null;
  const status: AdminSessionState['status'] = useMemo(() => {
    if (isLoading) return 'loading';
    if (!session) return 'signed-out';
    if (!isAdminEmail(email)) return 'not-admin';
    return 'admin';
  }, [isLoading, session, email]);

  return {
    status,
    session,
    email,
    isLoading,
    allowedEmails: ADMIN_ALLOWED_EMAILS,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
