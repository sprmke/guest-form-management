import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramStaffSettingsCard } from '@/features/admin/components/TelegramStaffSettingsCard';

/**
 * Admin Staff — daily booking summary for staff/cleaners via Telegram.
 */
export function AdminStaffPage() {
  return (
    <AdminLayout title="Staff" breadcrumb="Configure">
      <div className="w-full max-w-full space-y-4 p-3 sm:space-y-5 sm:p-4 lg:p-6">
        <TelegramStaffSettingsCard />
      </div>
    </AdminLayout>
  );
}
