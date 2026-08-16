import {
  ForgotPasswordPageContent,
  LoginPageContent,
  RegisterPageContent,
  ResetPasswordPageContent,
  VerifyEmailPageContent,
} from '@/features/guest/auth/components';
import { HostAuthResolving } from '@/features/guest/auth/components/HostAuthResolving';
import { AUTH_PAGE_CONFIG } from '@/features/guest/auth/config/auth-page-config';
import { useHostGoogleAuth } from '@/features/guest/auth/hooks/useHostGoogleAuth';
import { HOST_LOGIN_PATH, HOST_REGISTER_PATH } from '@/features/guest/auth/lib/hostAuthPaths';

import { appPageTitle, usePageTitle } from '@/lib/pageTitle';

export function HostLoginPage() {
  usePageTitle(appPageTitle('Sign In'));
  const hostGoogleAuth = useHostGoogleAuth({
    callbackPathname: HOST_LOGIN_PATH,
    defaultRedirect: '/dashboard',
  });

  if (hostGoogleAuth.status === 'admin' && hostGoogleAuth.isResolving) {
    return <HostAuthResolving />;
  }

  return <LoginPageContent config={AUTH_PAGE_CONFIG.host} hostGoogleAuth={hostGoogleAuth} />;
}

export function HostRegisterPage() {
  usePageTitle(appPageTitle('Register'));
  const hostGoogleAuth = useHostGoogleAuth({
    callbackPathname: HOST_REGISTER_PATH,
    defaultRedirect: '/onboarding',
  });

  if (hostGoogleAuth.status === 'admin' && hostGoogleAuth.isResolving) {
    return <HostAuthResolving />;
  }

  return <RegisterPageContent config={AUTH_PAGE_CONFIG.host} hostGoogleAuth={hostGoogleAuth} />;
}

export function HostForgotPasswordPage() {
  usePageTitle(appPageTitle('Forgot Password'));
  return <ForgotPasswordPageContent config={AUTH_PAGE_CONFIG.host} />;
}

export function HostResetPasswordPage() {
  usePageTitle(appPageTitle('Reset Password'));
  return <ResetPasswordPageContent config={AUTH_PAGE_CONFIG.host} />;
}

export function HostVerifyEmailPage() {
  usePageTitle(appPageTitle('Verify Email'));
  return <VerifyEmailPageContent config={AUTH_PAGE_CONFIG.host} />;
}
