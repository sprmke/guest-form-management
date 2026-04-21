import { Routes } from 'react-router-dom';
import { guestFormRoutes } from '@/features/guest-form/routes';
import { adminRoutes } from '@/features/admin/routes';

export function AppRoutes() {
  return (
    <Routes>
      {guestFormRoutes}
      {adminRoutes}
    </Routes>
  );
}
