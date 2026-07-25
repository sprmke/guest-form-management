import { Navigate, Route } from 'react-router-dom';

import { GuestAccountLayout } from '@/features/guest/account/components/GuestAccountLayout';
import { RequireGuestSession } from '@/features/guest/account/components/RequireGuestSession';
import {
  GUEST_ACCOUNT_PROFILE_PATH,
  GUEST_ACCOUNT_STAYS_PATH,
} from '@/features/guest/account/lib/guestAccountPaths';
import { GuestAccountIndexPage } from '@/features/guest/account/pages/GuestAccountIndexPage';
import { GuestMessagesPage } from '@/features/guest/account/pages/GuestMessagesPage';
import { GuestProfilePage } from '@/features/guest/account/pages/GuestProfilePage';
import { GuestTripsPage } from '@/features/guest/account/pages/GuestTripsPage';
import { GuestWishlistPage } from '@/features/guest/account/pages/GuestWishlistPage';

export const guestAccountRoutes = [
  <Route
    key="guest-account"
    path="account"
    element={
      <RequireGuestSession>
        <GuestAccountLayout />
      </RequireGuestSession>
    }
  >
    <Route index element={<GuestAccountIndexPage />} />
    <Route path="profile" element={<GuestProfilePage />} />
    <Route path="stays" element={<GuestTripsPage />} />
    <Route path="trips" element={<Navigate to={GUEST_ACCOUNT_STAYS_PATH} replace />} />
    <Route path="wishlist" element={<GuestWishlistPage />} />
    <Route path="messages" element={<GuestMessagesPage />} />
    <Route path="settings" element={<Navigate to={GUEST_ACCOUNT_PROFILE_PATH} replace />} />
  </Route>,
];
