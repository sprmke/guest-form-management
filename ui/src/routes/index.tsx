import { Routes } from 'react-router-dom';

import { dashboardRoutes } from '@/features/dashboard/routes';
import { guestRoutes } from '@/features/guest/routes';

export function AppRoutes() {
  return (
    <Routes>
      {guestRoutes}
      {dashboardRoutes}
    </Routes>
  );
}
