import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireSuperAdmin } from '@/features/dashboard/super-admin/components/RequireSuperAdmin';

export function SuperAdminShell() {
  return (
    <RequireSuperAdmin>
      <AdminLayoutOutlet />
    </RequireSuperAdmin>
  );
}
