import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { TelegramMarketingSettingsCard } from '@/features/admin/components/TelegramMarketingSettingsCard';

/**
 * Admin Marketing — Telegram reminder templates, toggles, and test sends.
 */
export function AdminMarketingPage() {
  return (
    <AdminLayout title="Marketing" breadcrumb="Configure">
      <div className="w-full max-w-full space-y-4 p-3 sm:space-y-5 sm:p-4 lg:p-6">
        <TelegramMarketingSettingsCard />
      </div>
    </AdminLayout>
  );
}
