import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramMarketingSettingsCard } from '@/features/admin/components/TelegramMarketingSettingsCard';

/**
 * Admin Marketing — Telegram reminder templates, toggles, and test sends.
 */
export function AdminMarketingPage() {
  return (
    <AdminLayout>
      <TelegramMarketingSettingsCard />
    </AdminLayout>
  );
}
