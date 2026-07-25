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

export function HostLoginPage() {
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
  return <ForgotPasswordPageContent config={AUTH_PAGE_CONFIG.host} />;
}

export function HostResetPasswordPage() {
  return <ResetPasswordPageContent config={AUTH_PAGE_CONFIG.host} />;
}

export function HostVerifyEmailPage() {
  return <VerifyEmailPageContent config={AUTH_PAGE_CONFIG.host} />;
}
