import { Route } from 'react-router-dom';
import { PayParkingPage } from '@/features/pay-parking/pages/PayParkingPage';

/** Public pay-parking form — guests and admins (no auth required). */
export const payParkingRoutes = [
  <Route
    key="pay-parking-by-id"
    path="/bookings/:bookingId/parking"
    element={<PayParkingPage />}
  />,
];
