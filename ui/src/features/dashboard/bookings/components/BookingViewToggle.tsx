import { Kanban } from 'lucide-react';

import { ADMIN_LIST_VIEW_OPTIONS } from '@/features/dashboard/bookings/components/AdminListViewToggle';
import type { AdminListView } from '@/features/dashboard/bookings/lib/listView';

import {
  AdminViewToggle,
  type AdminViewToggleOption,
} from '@/components/navigation/AdminViewToggle';

export type BookingView = AdminListView | 'kanban';

const BOOKING_VIEW_OPTIONS: AdminViewToggleOption<BookingView>[] = [
  ...ADMIN_LIST_VIEW_OPTIONS,
  { value: 'kanban', label: 'Kanban', Icon: Kanban },
];

type Props = {
  value: BookingView;
  onChange: (next: BookingView) => void;
  hideTableView?: boolean;
  hideKanbanView?: boolean;
  className?: string;
};

export function BookingViewToggle({
  value,
  onChange,
  hideTableView = false,
  hideKanbanView = false,
  className,
}: Props) {
  const hideValues: BookingView[] = [];
  if (hideTableView) hideValues.push('table');
  if (hideKanbanView) hideValues.push('kanban');

  return (
    <AdminViewToggle
      value={value}
      onChange={onChange}
      options={BOOKING_VIEW_OPTIONS}
      hideValues={hideValues}
      className={className}
      ariaLabel="Choose booking view"
    />
  );
}
