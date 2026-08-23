import { Navigate, Route } from 'react-router-dom';

import { AuthLayout } from '@/features/guest/auth/components/AuthLayout';
import { LegacySignInRedirect } from '@/features/guest/auth/components/LegacySignInRedirect';
import { GuestLoginPage, GuestRegisterPage } from '@/features/guest/auth/pages/GuestAuthPages';
import { HostLoginPage, HostRegisterPage } from '@/features/guest/auth/pages/HostAuthPages';

/** Host + guest auth pages — both passwordless (email OTP + Google). */
export const guestAuthRoutes = [
  <Route key="legacy-sign-in" path="/sign-in" element={<LegacySignInRedirect />} />,
  <Route key="auth-shell" element={<AuthLayout />}>
    <Route path="for-hosts/login" element={<HostLoginPage />} />
    <Route path="for-hosts/register" element={<HostRegisterPage />} />
    <Route path="for-guests/login" element={<GuestLoginPage />} />
    <Route path="for-guests/register" element={<GuestRegisterPage />} />
  </Route>,
  <Route
    key="legacy-guest-auth"
    path="/for-guests/*"
    element={<Navigate to="/for-guests/login" replace />}
  />,
];
