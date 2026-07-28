import type { LucideIcon } from 'lucide-react';

import { SegmentedControl } from '@/components/ui/sliding-tabs';

export type AdminViewToggleOption<T extends string> = {
  value: T;
  label: string;
  Icon: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  options: AdminViewToggleOption<T>[];
  hideValues?: T[];
  className?: string;
  ariaLabel?: string;
};

export function AdminViewToggle<T extends string>({
  value,
  onChange,
  options,
  hideValues = [],
  className,
  ariaLabel = 'Choose list view',
}: Props<T>) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options.map(({ value: optionValue, label, Icon }) => ({
        value: optionValue,
        label,
        icon: Icon,
      }))}
      hideValues={hideValues}
      className={className}
      listClassName="lg:p-0.5"
      triggerClassName="min-w-[36px] px-2 lg:min-w-0 lg:px-2.5"
      aria-label={ariaLabel}
    />
  );
}
