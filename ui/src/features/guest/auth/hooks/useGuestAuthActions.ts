import { useCallback } from 'react';

import { guestOAuthRedirectTo } from '@/features/guest/auth/lib/guestAuthPaths';

import { supabase } from '@/lib/supabase/client';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function useGuestAuthActions() {
  const sendEmailOtp = useCallback(async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: {
        shouldCreateUser: true,
        // Ignored by GoTrue unless [auth.captcha] is enabled; always sent so the
        // server can enforce it without a client change. Anti-spam plan:
        // docs/workflow/for-testing/captcha-anti-spam-hardening.md
        ...(captchaToken ? { captchaToken } : {}),
      },
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

  const signInWithGoogle = useCallback(async (returnPath: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: guestOAuthRedirectTo(returnPath),
        skipBrowserRedirect: false,
      },
    });
    return error;
  }, []);

  return { sendEmailOtp, verifyEmailOtp, signInWithGoogle };
}
