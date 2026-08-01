import * as React from 'react';

import { useSearchParams } from 'react-router-dom';

import { Car, DollarSign } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  AdminSection,
  AdminSectionGroupHeading,
  AdminSectionNavLayout,
  type AdminSectionNavGroup,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { TelegramFinanceSettingsCard } from '@/features/dashboard/bookings/components/TelegramFinanceSettingsCard';
import { TelegramGlobalBotTokenCard } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramGlobalBotTokenCard';
import { TelegramNotificationsGlobalBotProvider } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramNotificationsGlobalBotContext';
import { TelegramParkingSettingsCard } from '@/features/dashboard/parking/components/TelegramParkingSettingsCard';

const PARKING_NOTIFICATION_MODULES = ['parking', 'finance'] as const;

type ParkingNotificationModule = (typeof PARKING_NOTIFICATION_MODULES)[number];

function isParkingNotificationModule(value: string | null): value is ParkingNotificationModule {
  return PARKING_NOTIFICATION_MODULES.includes(value as ParkingNotificationModule);
}

const MODULE_SECTIONS: AdminSectionNavItem[] = [
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'finance', label: 'Finance', icon: DollarSign },
];

const NOTIFICATION_SECTION_GROUPS: AdminSectionNavGroup[] = [
  { label: 'Telegram notifications', sections: MODULE_SECTIONS },
];

const MODULE_DESCRIPTIONS: Record<ParkingNotificationModule, string> = {
  parking:
    'Reservation alerts for new requests, check-in reminders, and payment received on this slot.',
  finance: 'Due-date reminders for parking expense lines you track in Finance.',
};

export function ParkingNotificationsPage() {
  const [searchParams] = useSearchParams();
  const moduleParam = searchParams.get('module');
  const deepLinkModule = isParkingNotificationModule(moduleParam)
    ? moduleParam
    : moduleParam === 'marketing'
      ? 'parking'
      : null;

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
      <AdminSectionNavLayout
        sectionGroups={NOTIFICATION_SECTION_GROUPS}
        header={
          <AdminPageHeader
            id="parking-notifications-heading"
            variant="compact"
            title="Notifications"
            subtitle="Configure Telegram notifications for this parking slot."
          />
        }
      >
        <div className="space-y-3 sm:space-y-4">
          <TelegramGlobalBotTokenCard />

          <AdminSectionGroupHeading title="Telegram notifications" count={MODULE_SECTIONS.length} />

          <AdminSection
            id="parking"
            title="Parking"
            icon={Car}
            description={MODULE_DESCRIPTIONS.parking}
          >
            <TelegramParkingSettingsCard />
          </AdminSection>

          <AdminSection
            id="finance"
            title="Finance"
            icon={DollarSign}
            description={MODULE_DESCRIPTIONS.finance}
          >
            <TelegramFinanceSettingsCard embedded />
          </AdminSection>
        </div>
      </AdminSectionNavLayout>
    </TelegramNotificationsGlobalBotProvider>
  );
}
