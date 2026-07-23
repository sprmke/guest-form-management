import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { PropertySettingsIssuesSync } from '@/features/dashboard/org/components/PropertySettingsIssuesSync';
import { RequireOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';

/** Property-scoped admin shell: auth + org/property context + persistent AdminLayout. */
export function PropertyAdminShell() {
  return (
    <RequireAdmin>
      <RequireOrgContext>
        <PropertySettingsIssuesSync />
        <AdminLayoutOutlet />
      </RequireOrgContext>
    </RequireAdmin>
  );
}
