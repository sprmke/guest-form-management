import * as React from 'react';

import { useSearchParams } from 'react-router-dom';

import { Bell, DollarSign, HardHat, Megaphone, MessageCircle, Wrench } from 'lucide-react';

import {
  AdminSection,
  AdminSectionGroupHeading,
  AdminSectionNavLayout,
  type AdminSectionNavGroup,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { TelegramGlobalBotTokenCard } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramGlobalBotTokenCard';
import { TelegramHelpDialog } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramHelpDialog';
import { TelegramNotificationsGlobalBotProvider } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramNotificationsGlobalBotContext';
import { TelegramAdminSettingsCard } from '@/features/dashboard/bookings/components/TelegramAdminSettingsCard';
import { TelegramChatSettingsCard } from '@/features/dashboard/bookings/components/TelegramChatSettingsCard';
import { TelegramFinanceSettingsCard } from '@/features/dashboard/bookings/components/TelegramFinanceSettingsCard';
import { TelegramMaintenanceSettingsCard } from '@/features/dashboard/bookings/components/TelegramMaintenanceSettingsCard';
import { TelegramMarketingSettingsCard } from '@/features/dashboard/bookings/components/TelegramMarketingSettingsCard';
import { TelegramStaffSettingsCard } from '@/features/dashboard/bookings/components/TelegramStaffSettingsCard';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';

const NOTIFICATION_MODULES = [
  'marketing',
  'staff',
  'operations',
  'finance',
  'maintenance',
  'chat',
] as const;

type PropertyNotificationModule = (typeof NOTIFICATION_MODULES)[number];

function isNotificationModule(value: string | null): value is PropertyNotificationModule {
  return (NOTIFICATION_MODULES as readonly string[]).includes(value ?? '');
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

const MODULE_DESCRIPTIONS: Record<PropertyNotificationModule, string> = {
  marketing:
    'Daily calendar alerts, plus instant messages when a guest submits or cancels a booking.',
  staff: 'Daily staff summary at your chosen Manila time.',
  operations:
    'Booking workflow updates as guests move through documents, parking, pets, and check-in stages.',
  finance: 'Due-date reminders for tracked property expenses.',
  maintenance: 'Upcoming reminders for scheduled property upkeep items.',
  chat: 'Instant alert for every inbound guest message from web chat, Facebook, or Instagram.',
};

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
    <TelegramNotificationsGlobalBotProvider>
      <AdminMobilePage
        title="Notifications"
        subtitle="Configure Telegram notifications for this property."
        titleId="notifications-heading"
      >
        <AdminSectionNavLayout
          className="min-h-0 flex-1"
          sectionGroups={NOTIFICATION_SECTION_GROUPS}
        >
          <div className="space-y-3 sm:space-y-4">
            <AdminSectionGroupHeading
              title="Telegram notifications"
              count={MODULE_SECTIONS.length}
              action={<TelegramHelpDialog defaultTab="bot-token" triggerLabel="Get Help" />}
            />

            <TelegramGlobalBotTokenCard />

            <AdminSection
              id="marketing"
              title="Marketing"
              icon={Megaphone}
              description={MODULE_DESCRIPTIONS.marketing}
            >
              <TelegramMarketingSettingsCard embedded />
            </AdminSection>

            <AdminSection
              id="staff"
              title="Staff"
              icon={HardHat}
              description={MODULE_DESCRIPTIONS.staff}
            >
              <TelegramStaffSettingsCard embedded />
            </AdminSection>

            <AdminSection
              id="operations"
              title="Operations"
              icon={Bell}
              description={MODULE_DESCRIPTIONS.operations}
            >
              <TelegramAdminSettingsCard embedded />
            </AdminSection>

            <AdminSection
              id="finance"
              title="Finance"
              icon={DollarSign}
              description={MODULE_DESCRIPTIONS.finance}
            >
              <TelegramFinanceSettingsCard embedded />
            </AdminSection>

            <AdminSection
              id="maintenance"
              title="Maintenance"
              icon={Wrench}
              description={MODULE_DESCRIPTIONS.maintenance}
            >
              <TelegramMaintenanceSettingsCard embedded />
            </AdminSection>

            <AdminSection
              id="chat"
              title="Chat"
              icon={MessageCircle}
              description={MODULE_DESCRIPTIONS.chat}
            >
              <TelegramChatSettingsCard embedded />
            </AdminSection>
          </div>
        </AdminSectionNavLayout>
      </AdminMobilePage>
    </TelegramNotificationsGlobalBotProvider>
  );
}
