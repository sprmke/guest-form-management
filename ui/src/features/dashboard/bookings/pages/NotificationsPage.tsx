import * as React from 'react';

import { useSearchParams } from 'react-router-dom';

import { Bell, DollarSign, HardHat, Megaphone, MessageCircle, Wrench } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  AdminSection,
  AdminSectionGroupHeading,
  AdminSectionNavLayout,
  type AdminSectionNavGroup,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { TelegramAdminSettingsCard } from '@/features/dashboard/bookings/components/TelegramAdminSettingsCard';
import { TelegramChatSettingsCard } from '@/features/dashboard/bookings/components/TelegramChatSettingsCard';
import { TelegramFinanceSettingsCard } from '@/features/dashboard/bookings/components/TelegramFinanceSettingsCard';
import { TelegramMaintenanceSettingsCard } from '@/features/dashboard/bookings/components/TelegramMaintenanceSettingsCard';
import { TelegramMarketingSettingsCard } from '@/features/dashboard/bookings/components/TelegramMarketingSettingsCard';
import { TelegramStaffSettingsCard } from '@/features/dashboard/bookings/components/TelegramStaffSettingsCard';
import { type NotificationModule } from '@/features/dashboard/org/lib/tenantPaths';

const NOTIFICATION_MODULES: NotificationModule[] = [
  'marketing',
  'staff',
  'operations',
  'finance',
  'maintenance',
  'chat',
];

function isNotificationModule(value: string | null): value is NotificationModule {
  return NOTIFICATION_MODULES.includes(value as NotificationModule);
}

const MODULE_SECTIONS: AdminSectionNavItem[] = [
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'staff', label: 'Staff', icon: HardHat },
  { id: 'operations', label: 'Operations', icon: Bell },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

const NOTIFICATION_SECTION_GROUPS: AdminSectionNavGroup[] = [
  { label: 'Telegram notifications', sections: MODULE_SECTIONS },
];

export function NotificationsPage() {
  const [searchParams] = useSearchParams();
  const moduleParam = searchParams.get('module');
  const deepLinkModule = isNotificationModule(moduleParam) ? moduleParam : null;

  React.useEffect(() => {
    if (!deepLinkModule) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`section-${deepLinkModule}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [deepLinkModule]);

  return (
    <AdminSectionNavLayout
      sectionGroups={NOTIFICATION_SECTION_GROUPS}
      header={
        <AdminPageHeader
          id="notifications-heading"
          variant="compact"
          title="Notifications"
          subtitle="Configure Telegram notifications for this property."
        />
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <AdminSectionGroupHeading title="Telegram notifications" count={MODULE_SECTIONS.length} />

        <AdminSection id="marketing" title="Marketing" icon={Megaphone}>
          <TelegramMarketingSettingsCard embedded />
        </AdminSection>

        <AdminSection id="staff" title="Staff" icon={HardHat}>
          <TelegramStaffSettingsCard embedded />
        </AdminSection>

        <AdminSection id="operations" title="Operations" icon={Bell}>
          <TelegramAdminSettingsCard embedded />
        </AdminSection>

        <AdminSection id="finance" title="Finance" icon={DollarSign}>
          <TelegramFinanceSettingsCard embedded />
        </AdminSection>

        <AdminSection id="maintenance" title="Maintenance" icon={Wrench}>
          <TelegramMaintenanceSettingsCard embedded />
        </AdminSection>

        <AdminSection id="chat" title="Chat" icon={MessageCircle}>
          <TelegramChatSettingsCard embedded />
        </AdminSection>
      </div>
    </AdminSectionNavLayout>
  );
}
