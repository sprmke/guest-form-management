import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AuthAudience } from '@/features/guest/auth/config/auth-page-config';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/button';
import { GoogleIcon, FacebookIcon, SpinnerIcon } from '@/components/ui/icons';

interface SocialAuthButtonsProps {
  mode: 'login' | 'register';
  disabled?: boolean;
  audience?: AuthAudience;
  /** Host: real Google OAuth via Supabase. */
  onGoogleSignIn?: () => void | Promise<void>;
  googleLoading?: boolean;
  /** Guest: mock redirect after social sign-in. */
  successRedirect: string;
}

export function SocialAuthButtons({
  mode: _mode,
  disabled,
  audience = 'guest',
  onGoogleSignIn,
  googleLoading = false,
  successRedirect,
}: SocialAuthButtonsProps) {
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);

  const handleGuestGoogle = async () => {
    setLoadingProvider('google');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate(successRedirect);
    setLoadingProvider(null);
  };

  const handleFacebook = async () => {
    setLoadingProvider('facebook');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate(successRedirect);
    setLoadingProvider(null);
  };

  if (audience === 'host') {
    return (
      <GoogleSignInButton
        onClick={() => void onGoogleSignIn?.()}
        disabled={disabled}
        loading={googleLoading}
      />
    );
  }

  const isDisabled = disabled || loadingProvider !== null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        type="button"
        onClick={() => void handleGuestGoogle()}
        disabled={isDisabled}
        className="h-11 font-medium"
      >
        {loadingProvider === 'google' ? (
          <SpinnerIcon className="h-4 w-4" />
        ) : (
          <GoogleIcon className="h-5 w-5" />
        )}
        <span className="sr-only sm:not-sr-only sm:ml-2">Google</span>
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={() => void handleFacebook()}
        disabled={isDisabled}
        className="h-11 font-medium"
      >
        {loadingProvider === 'facebook' ? (
          <SpinnerIcon className="h-4 w-4" />
        ) : (
          <FacebookIcon className="h-5 w-5" />
        )}
        <span className="sr-only sm:not-sr-only sm:ml-2">Facebook</span>
      </Button>
    </div>
  );
}
