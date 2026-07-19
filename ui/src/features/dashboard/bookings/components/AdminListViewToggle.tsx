import { CalendarDays, LayoutGrid, LayoutList } from 'lucide-react';

import type { AdminListView } from '@/features/dashboard/bookings/lib/listView';

import {
  AdminViewToggle,
  type AdminViewToggleOption,
} from '@/components/navigation/AdminViewToggle';

export const ADMIN_LIST_VIEW_OPTIONS: AdminViewToggleOption<AdminListView>[] = [
  { value: 'table', label: 'Table', Icon: LayoutList },
  { value: 'card', label: 'Card', Icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', Icon: CalendarDays },
];

type Props = {
  value: AdminListView;
  onChange: (next: AdminListView) => void;
  hideTableView?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function AdminListViewToggle({
  value,
  onChange,
  hideTableView = false,
  className,
  ariaLabel = 'Choose list view',
}: Props) {
  return (
    <AdminViewToggle
      value={value}
      onChange={onChange}
      options={ADMIN_LIST_VIEW_OPTIONS}
      hideValues={hideTableView ? ['table'] : []}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}
