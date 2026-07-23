import type { MaintenanceTelegramFilter } from '@/features/dashboard/maintenance/lib/types';

import { AdminSingleSelectFilter } from '@/components/navigation/AdminSingleSelectFilter';

const OPTIONS: { value: MaintenanceTelegramFilter; label: string }[] = [
  { value: 'all', label: 'All reminders' },
  { value: 'enabled', label: 'Telegram on' },
  { value: 'disabled', label: 'Telegram off' },
];

type Props = {
  value: MaintenanceTelegramFilter;
  onChange: (next: MaintenanceTelegramFilter) => void;
};

export function MaintenanceTelegramFilter({ value, onChange }: Props) {
  return (
    <AdminSingleSelectFilter
      options={OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="Telegram filter"
      triggerWidthClassName="sm:w-[10.5rem]"
    />
  );
}
