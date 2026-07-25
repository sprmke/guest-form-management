import { Route } from 'react-router-dom';

import { CalendarPage } from '@/features/guest/calendar/pages/CalendarPage';

export const guestCalendarRoutes = [
  <Route key="guest-calendar-path" path="calendar" element={<CalendarPage />} />,
];
