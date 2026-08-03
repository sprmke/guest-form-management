import { AdminLayoutOutlet } from '@/features/dashboard/bookings/components/AdminLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { ListingContractAccessGate } from '@/features/dashboard/org/components/ListingContractAccessGate';
import { RequireOrgNotHardRejected } from '@/features/dashboard/org/components/RequireOrgNotHardRejected';
import { RequireParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';

/** Auth + parking tenant context + persistent AdminLayout. */
export function ParkingAdminShell() {
  return (
    <RequireAdmin>
      <RequireOrgNotHardRejected>
        <RequireParkingContext>
          <ListingContractAccessGate leg="parking">
            <AdminLayoutOutlet />
          </ListingContractAccessGate>
        </RequireParkingContext>
      </RequireOrgNotHardRejected>
    </RequireAdmin>
  );
}
