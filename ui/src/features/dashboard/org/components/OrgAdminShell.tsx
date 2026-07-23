import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';

/** Org-scoped admin shell: auth + persistent AdminLayout (org slug from route params). */
export function OrgAdminShell() {
  return (
    <RequireAdmin>
      <AdminLayoutOutlet />
    </RequireAdmin>
  );
}
