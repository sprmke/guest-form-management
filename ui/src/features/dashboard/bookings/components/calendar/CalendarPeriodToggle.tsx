import type { CalendarPeriod } from '@/features/dashboard/bookings/components/calendar/calendarTimeGridUtils';

import { SegmentedControl } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';

type Props = {
  value: CalendarPeriod;
  onChange: (next: CalendarPeriod) => void;
  className?: string;
  size?: 'default' | 'toolbar';
};

export function CalendarPeriodToggle({ value, onChange, className, size = 'toolbar' }: Props) {
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
      aria-label="Calendar period"
      options={[
        { value: 'month', label: 'Month' },
        { value: 'week', label: 'Week' },
        { value: 'day', label: 'Day' },
      ]}
    />
  );
}
