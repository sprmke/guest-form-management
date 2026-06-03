import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramAdminSettingsCard } from '@/features/admin/components/TelegramAdminSettingsCard';

/**
 * Admin Operations — workflow Telegram alerts for the admin team.
 */
export function AdminOperationsPage() {
  return (
    <AdminLayout>
      <TelegramAdminSettingsCard />
    </AdminLayout>
  );
}
