import { Route } from 'react-router-dom';
import { GuestForm } from '@/features/guest-form/components/GuestForm';
import { GuestFormSuccess } from '@/features/guest-form/components/GuestFormSuccess';
import { CalendarPage } from '@/features/guest-form/pages/CalendarPage';
import { MainLayout } from '@/layouts/MainLayout';

export const guestFormRoutes = [
  <Route
    key="guest-public"
    element={<MainLayout animateOnNavigate />}
  >
    <Route index element={<CalendarPage />} />
    <Route path="calendar" element={<CalendarPage />} />
    <Route path="form" element={<GuestForm />} />
    <Route path="success" element={<GuestFormSuccess />} />
  </Route>,
];
