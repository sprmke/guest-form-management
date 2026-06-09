import { Route } from 'react-router-dom';
import { SignInPage } from '@/features/admin/pages/SignInPage';
import { BookingsListPage } from '@/features/admin/pages/BookingsListPage';
import { BookingDetailPage } from '@/features/admin/pages/BookingDetailPage';
import { AdminSettingsPage } from '@/features/admin/pages/AdminSettingsPage';
import { AdminMarketingPage } from '@/features/admin/pages/AdminMarketingPage';
import { AdminStaffPage } from '@/features/admin/pages/AdminStaffPage';
import { AdminOperationsPage } from '@/features/admin/pages/AdminOperationsPage';
import { FinancePage } from '@/features/finance/pages/FinancePage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { RequireAdmin } from '@/features/admin/components/RequireAdmin';

export const adminRoutes = [
  <Route key="admin-sign-in" path="/sign-in" element={<SignInPage />} />,
  <Route
    key="admin-dashboard"
    path="/dashboard"
    element={
      <RequireAdmin>
        <DashboardPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-marketing"
    path="/marketing"
    element={
      <RequireAdmin>
        <AdminMarketingPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-staff"
    path="/staff"
    element={
      <RequireAdmin>
        <AdminStaffPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-operations"
    path="/operations"
    element={
      <RequireAdmin>
        <AdminOperationsPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-settings"
    path="/settings"
    element={
      <RequireAdmin>
        <AdminSettingsPage />
      </RequireAdmin>
    }
  />,
  <Route
    key="admin-finance"
    path="/finance"
    element={
      <RequireAdmin>
        <FinancePage />
      </RequireAdmin>
    }
  />,
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
