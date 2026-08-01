import { SegmentedControl } from '@/components/ui/sliding-tabs';

export type PropertyCalendarViewId = 'occupancy' | 'pricing';

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
    <SegmentedControl
      value={value}
      onChange={onChange}
      className={className}
      hideValues={hideValues}
      listClassName="border-border/60 w-full"
      triggerClassName="h-9 min-h-[44px] px-2.5 text-[11px] sm:h-7 sm:min-h-0"
      aria-label="Choose calendar view"
      options={[
        { value: 'occupancy', label: 'View Occupancy' },
        { value: 'pricing', label: 'Manage Pricing' },
      ]}
    />
  );
}
