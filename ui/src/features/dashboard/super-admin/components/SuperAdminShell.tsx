import { Outlet } from 'react-router-dom';

import { AdminLayout } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireSuperAdmin } from '@/features/dashboard/super-admin/components/RequireSuperAdmin';

export function SuperAdminShell() {
  return (
    <RequireSuperAdmin>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </RequireSuperAdmin>
  );
}
