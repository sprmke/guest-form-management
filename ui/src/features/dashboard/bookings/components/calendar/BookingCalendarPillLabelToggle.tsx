import { SegmentedControl } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';

export type BookingCalendarPillLabelMode = 'name' | 'price';

type Props = {
  value: BookingCalendarPillLabelMode;
  onChange: (next: BookingCalendarPillLabelMode) => void;
  className?: string;
  /** `toolbar` matches CalendarMonthGrid nav button height (36px). */
  size?: 'default' | 'toolbar';
};

export function BookingCalendarPillLabelToggle({
  value,
  onChange,
  className,
  size = 'default',
}: Props) {
  const toolbar = size === 'toolbar';

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      size={toolbar ? 'dense' : 'compact'}
      className={className}
      listClassName={cn('border-border/60', toolbar ? 'h-9 min-h-[36px] w-auto p-0.5' : 'w-full')}
      triggerClassName={
        toolbar
          ? 'h-full min-h-0 px-2.5 py-0 text-[11px]'
          : 'h-9 min-h-[44px] px-2.5 text-[11px] sm:h-7 sm:min-h-0'
      }
      aria-label="Calendar pill display"
      options={[
        { value: 'name', label: 'Name' },
        { value: 'price', label: 'Price' },
      ]}
    />
  );
}
