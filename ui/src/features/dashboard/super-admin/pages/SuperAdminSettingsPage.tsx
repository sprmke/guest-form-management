import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { AiCreditWalletCard } from '@/features/dashboard/super-admin/components/AiCreditWalletCard';
import { AiDashboardAssistantKillSwitchCard } from '@/features/dashboard/super-admin/components/AiDashboardAssistantKillSwitchCard';
import { AiPlatformKillSwitchCard } from '@/features/dashboard/super-admin/components/AiPlatformKillSwitchCard';

export function SuperAdminSettingsPage() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader title="AI Management" />
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <AiPlatformKillSwitchCard />
        <AiDashboardAssistantKillSwitchCard />
        <AiCreditWalletCard />
      </div>
    </div>
  );
}
