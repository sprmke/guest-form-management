import { CalendarDays, Tag } from 'lucide-react';

import {
  AdminViewToggle,
  type AdminViewToggleOption,
} from '@/components/navigation/AdminViewToggle';

export type PropertyCalendarViewId = 'occupancy' | 'pricing';

const PROPERTY_CALENDAR_VIEW_OPTIONS: AdminViewToggleOption<PropertyCalendarViewId>[] = [
  { value: 'occupancy', label: 'Occupancy', Icon: CalendarDays },
  { value: 'pricing', label: 'Pricing', Icon: Tag },
];

type Props = {
  value: PropertyCalendarViewId;
  onChange: (v: PropertyCalendarViewId) => void;
  showOccupancy: boolean;
  showPricing: boolean;
  className?: string;
};

export function PropertyCalendarViewToggle({
  value,
  onChange,
  showOccupancy,
  showPricing,
  className,
}: Props) {
  const hideValues: PropertyCalendarViewId[] = [];
  if (!showOccupancy) hideValues.push('occupancy');
  if (!showPricing) hideValues.push('pricing');

  return (
    <AdminViewToggle
      value={value}
      onChange={onChange}
      options={PROPERTY_CALENDAR_VIEW_OPTIONS}
      hideValues={hideValues}
      className={className}
      ariaLabel="Choose calendar view"
    />
  );
}
