import { Navigate, Route } from 'react-router-dom';

import { GuestAccountLayout } from '@/features/guest/account/components/GuestAccountLayout';
import { RequireGuestSession } from '@/features/guest/account/components/RequireGuestSession';
import {
  GUEST_ACCOUNT_FAVORITES_PATH,
  GUEST_ACCOUNT_PROFILE_PATH,
  GUEST_ACCOUNT_STAYS_PATH,
} from '@/features/guest/account/lib/guestAccountPaths';
import { GuestAccountIndexPage } from '@/features/guest/account/pages/GuestAccountIndexPage';
import { GuestMessagesPage } from '@/features/guest/account/pages/GuestMessagesPage';
import { GuestProfilePage } from '@/features/guest/account/pages/GuestProfilePage';
import { GuestTicketsPage } from '@/features/guest/account/pages/GuestTicketsPage';
import { GuestVouchersPage } from '@/features/guest/account/pages/GuestVouchersPage';
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
    <Route path="stays" element={<GuestMessagesPage />} />
    <Route path="vouchers" element={<GuestVouchersPage />} />
    <Route path="favorites" element={<GuestWishlistPage />} />
    <Route path="tickets/*" element={<GuestTicketsPage />} />
    <Route path="trips" element={<Navigate to={GUEST_ACCOUNT_STAYS_PATH} replace />} />
    <Route path="messages" element={<Navigate to={GUEST_ACCOUNT_STAYS_PATH} replace />} />
    <Route path="wishlist" element={<Navigate to={GUEST_ACCOUNT_FAVORITES_PATH} replace />} />
    <Route path="settings" element={<Navigate to={GUEST_ACCOUNT_PROFILE_PATH} replace />} />
  </Route>,
];
