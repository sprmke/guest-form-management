import { useCallback } from 'react';

import { guestOAuthRedirectTo } from '@/features/guest/auth/lib/guestAuthPaths';

import { supabase } from '@/lib/supabase/client';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function useGuestAuthActions() {
  const sendEmailOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true },
    });
    return error;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: token.trim(),
      type: 'email',
    });
    return error;
  }, []);

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'facebook', returnPath: string) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: guestOAuthRedirectTo(returnPath),
          skipBrowserRedirect: false,
        },
      });
      return error;
    },
    []
  );

  return { sendEmailOtp, verifyEmailOtp, signInWithOAuth };
}
