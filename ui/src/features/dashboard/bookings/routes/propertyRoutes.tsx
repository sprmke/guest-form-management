import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { NotificationModuleRedirect } from '@/features/dashboard/bookings/components/NotificationModuleRedirect';
import { AdminSettingsPage } from '@/features/dashboard/bookings/pages/AdminSettingsPage';
import { BookingDetailPage } from '@/features/dashboard/bookings/pages/BookingDetailPage';
import { BookingsListPage } from '@/features/dashboard/bookings/pages/BookingsListPage';
import { NotificationsPage } from '@/features/dashboard/bookings/pages/NotificationsPage';
import { TemplatesPage } from '@/features/dashboard/bookings/pages/TemplatesPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function adminPropertyRoutes(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route path="bookings" element={propertyRoute('bookings', <BookingsListPage />)} />
      <Route
        path="bookings/:bookingId"
        element={propertyRoute('bookings', <BookingDetailPage />)}
      />
      <Route path="notifications" element={propertyRoute('notifications', <NotificationsPage />)} />
      <Route path="templates" element={propertyRoute('templates', <TemplatesPage />)} />
      <Route
        path="staff"
        element={propertyRoute('notifications', <NotificationModuleRedirect module="staff" />)}
      />
      <Route
        path="operations"
        element={propertyRoute('notifications', <NotificationModuleRedirect module="operations" />)}
      />
      <Route path="settings" element={propertyRoute('settings', <AdminSettingsPage />)} />
    </>
  );
}
