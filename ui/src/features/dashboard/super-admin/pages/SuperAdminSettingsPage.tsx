import { AiCreditWalletCard } from '@/features/dashboard/super-admin/components/AiCreditWalletCard';
import { AiDashboardAssistantKillSwitchCard } from '@/features/dashboard/super-admin/components/AiDashboardAssistantKillSwitchCard';
import { AiPlatformKillSwitchCard } from '@/features/dashboard/super-admin/components/AiPlatformKillSwitchCard';
import { SuperAdminPage } from '@/features/dashboard/super-admin/components/shared/SuperAdminPage';

import { appPageTitle, usePageTitle } from '@/lib/pageTitle';

export function SuperAdminSettingsPage() {
  usePageTitle(appPageTitle('AI Management'));

  return (
    <SuperAdminPage
      title="AI Management"
      subtitle="Platform-wide AI kill switches, quotas, and org credit wallets. Changes apply immediately across every organization."
    >
      <div className="space-y-4">
        <AiPlatformKillSwitchCard />
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <AiDashboardAssistantKillSwitchCard />
          <AiCreditWalletCard />
        </div>
      </div>
    </SuperAdminPage>
  );
}
