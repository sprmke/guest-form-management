import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireSuperAdmin } from '@/features/dashboard/super-admin/components/RequireSuperAdmin';
import { SuperAdminCommandPalette } from '@/features/dashboard/super-admin/components/SuperAdminCommandPalette';

export function SuperAdminShell() {
  return (
    <RequireSuperAdmin>
      <SuperAdminCommandPalette />
      <AdminLayoutOutlet />
    </RequireSuperAdmin>
  );
}
