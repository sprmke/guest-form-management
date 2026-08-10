import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { ParkingInboxPage } from '@/features/dashboard/inbox/pages/ParkingInboxPage';
import type { ParkingRouteFn } from '@/features/dashboard/org/routes/guards';
import { ParkingBookingDetailPage } from '@/features/dashboard/parking/pages/ParkingBookingDetailPage';
import { ParkingBookingsPage } from '@/features/dashboard/parking/pages/ParkingBookingsPage';
import { ParkingDashboardPage } from '@/features/dashboard/parking/pages/ParkingDashboardPage';
import { ParkingFinancePage } from '@/features/dashboard/parking/pages/ParkingFinancePage';
import { ParkingNotificationsPage } from '@/features/dashboard/parking/pages/ParkingNotificationsPage';
import { ParkingPricingPage } from '@/features/dashboard/parking/pages/ParkingPricingPage';
import { ParkingSettingsPage } from '@/features/dashboard/parking/pages/ParkingSettingsPage';

export function parkingAdminRoutes(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <>
      <Route index element={<ParkingDashboardPage />} />
      <Route path="bookings" element={<ParkingBookingsPage />} />
      <Route path="bookings/:bookingId" element={<ParkingBookingDetailPage />} />
      <Route path="finance" element={<ParkingFinancePage />} />
      <Route path="pricing" element={<ParkingPricingPage />} />
      <Route path="notifications" element={<ParkingNotificationsPage />} />
      <Route path="settings" element={<ParkingSettingsPage />} />
      <Route path="inbox" element={parkingRoute('inbox', <ParkingInboxPage />)} />
    </>
  );
}
