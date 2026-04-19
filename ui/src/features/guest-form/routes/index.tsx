import { Route } from 'react-router-dom';
import { GuestFormPage } from '@/features/guest-form/pages/GuestFormPage';
import { GuestFormSuccessPage } from '@/features/guest-form/pages/GuestFormSuccessPage';
import { CalendarPage } from '@/features/guest-form/pages/CalendarPage';

export const guestFormRoutes = [
  <Route key="calendar-root" path="/" element={<CalendarPage />} />,
  <Route key="guest-form" path="/form" element={<GuestFormPage />} />,
  <Route
    key="guest-form-success"
    path="/success"
    element={<GuestFormSuccessPage />}
  />,
  <Route key="calendar" path="/calendar" element={<CalendarPage />} />,
];
