import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramAdminSettingsCard } from '@/features/admin/components/TelegramAdminSettingsCard';

/**
 * Admin Operations — workflow Telegram alerts for the admin team.
 */
export function AdminOperationsPage() {
  return (
    <AdminLayout title="Operations" breadcrumb="Configure">
      <div className="w-full max-w-full space-y-4 p-3 sm:space-y-5 sm:p-4 lg:p-6">
        <TelegramAdminSettingsCard />
      </div>
    </AdminLayout>
  );
}
