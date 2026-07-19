import { SegmentedControl } from '@/components/ui/sliding-tabs';

export type BookingCalendarPillLabelMode = 'name' | 'price';

type Props = {
  value: BookingCalendarPillLabelMode;
  onChange: (next: BookingCalendarPillLabelMode) => void;
  className?: string;
};

export function BookingCalendarPillLabelToggle({ value, onChange, className }: Props) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      className={className}
      listClassName="border-border/60 w-full"
      triggerClassName="h-9 min-h-[44px] px-2.5 text-[11px] sm:h-7 sm:min-h-0"
      aria-label="Calendar pill display"
      options={[
        { value: 'name', label: 'Name' },
        { value: 'price', label: 'Price' },
      ]}
    />
  );
}
