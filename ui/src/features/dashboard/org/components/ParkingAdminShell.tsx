import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { RequireOrgNotHardRejected } from '@/features/dashboard/org/components/RequireOrgNotHardRejected';
import { RequireParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';

/** Auth + parking tenant context + persistent AdminLayout. */
export function ParkingAdminShell() {
  return (
    <RequireAdmin>
      <RequireOrgNotHardRejected>
        <RequireParkingContext>
          <AdminLayoutOutlet />
        </RequireParkingContext>
      </RequireOrgNotHardRejected>
    </RequireAdmin>
  );
}
