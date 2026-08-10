import { Navigate, Route } from 'react-router-dom';

import { AuthLayout } from '@/features/guest/auth/components/AuthLayout';
import { LegacySignInRedirect } from '@/features/guest/auth/components/LegacySignInRedirect';
import {
  HostForgotPasswordPage,
  HostLoginPage,
  HostRegisterPage,
  HostResetPasswordPage,
  HostVerifyEmailPage,
} from '@/features/guest/auth/pages/HostAuthPages';

/** Host auth pages. Guest auth is modal-only at booking checkout — `/for-guests/*` redirects home. */
export const guestAuthRoutes = [
  <Route key="legacy-sign-in" path="/sign-in" element={<LegacySignInRedirect />} />,
  <Route key="legacy-guest-auth" path="/for-guests/*" element={<Navigate to="/" replace />} />,
  <Route key="auth-shell" element={<AuthLayout />}>
    <Route path="for-hosts/login" element={<HostLoginPage />} />
    <Route path="for-hosts/register" element={<HostRegisterPage />} />
    <Route path="for-hosts/forgot-password" element={<HostForgotPasswordPage />} />
    <Route path="for-hosts/reset-password" element={<HostResetPasswordPage />} />
    <Route path="for-hosts/verify-email" element={<HostVerifyEmailPage />} />
  </Route>,
];
