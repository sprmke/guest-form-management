import { Kanban } from 'lucide-react';

import type { AdminListView } from '@/features/dashboard/bookings/lib/listView';

import { ADMIN_LIST_VIEW_OPTIONS } from '@/features/dashboard/bookings/components/AdminListViewToggle';

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
  className?: string;
};

export function BookingViewToggle({ value, onChange, hideTableView = false, className }: Props) {
  return (
    <AdminViewToggle
      value={value}
      onChange={onChange}
      options={BOOKING_VIEW_OPTIONS}
      hideValues={hideTableView ? ['table'] : []}
      className={className}
      ariaLabel="Choose booking view"
    />
  );
}
