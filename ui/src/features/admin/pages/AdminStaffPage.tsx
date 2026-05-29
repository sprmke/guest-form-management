import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramStaffSettingsCard } from '@/features/admin/components/TelegramStaffSettingsCard';

/**
 * Admin Staff — daily booking summary for staff/cleaners via Telegram.
 */
export function AdminStaffPage() {
  return (
    <AdminLayout>
      <TelegramStaffSettingsCard />
    </AdminLayout>
  );
}
