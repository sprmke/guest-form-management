import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { RequireOrgNotHardRejected } from '@/features/dashboard/org/components/RequireOrgNotHardRejected';

/** Org-scoped admin shell: auth + persistent AdminLayout (org slug from route params). */
export function OrgAdminShell() {
  return (
    <RequireAdmin>
      <RequireOrgNotHardRejected>
        <AdminLayoutOutlet />
      </RequireOrgNotHardRejected>
    </RequireAdmin>
  );
}
