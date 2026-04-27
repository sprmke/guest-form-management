import { Route } from 'react-router-dom';
import { SignInPage } from '@/features/admin/pages/SignInPage';
import { BookingsListPage } from '@/features/admin/pages/BookingsListPage';
import { BookingDetailPage } from '@/features/admin/pages/BookingDetailPage';
import { RequireAdmin } from '@/features/admin/components/RequireAdmin';

export const adminRoutes = [
  <Route key="admin-sign-in" path="/sign-in" element={<SignInPage />} />,
  <Route
    key="admin-bookings"
    path="/bookings"
    element={
      <RequireAdmin>
        <BookingsListPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-booking-detail"
    path="/bookings/:bookingId"
    element={
      <RequireAdmin>
        <BookingDetailPage />
      </RequireAdmin>
    }
  />,
];
