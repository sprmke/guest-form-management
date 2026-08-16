import { AiDashboardAssistantKillSwitchCard } from '@/features/dashboard/super-admin/components/AiDashboardAssistantKillSwitchCard';
import { AiPlatformKillSwitchCard } from '@/features/dashboard/super-admin/components/AiPlatformKillSwitchCard';

export function SuperAdminSettingsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-admin-page-title sm:text-xl">Settings</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AiPlatformKillSwitchCard />
        <AiDashboardAssistantKillSwitchCard />
      </div>
    </div>
  );
}
