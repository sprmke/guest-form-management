import { CalendarDays, LayoutGrid, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminListView } from '@/features/admin/lib/listView';

const VIEW_OPTIONS: {
  value: AdminListView;
  label: string;
  Icon: typeof LayoutList;
}[] = [
  { value: 'table', label: 'Table', Icon: LayoutList },
  { value: 'card', label: 'Card', Icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', Icon: CalendarDays },
];

type Props = {
  value: AdminListView;
  onChange: (next: AdminListView) => void;
  /** Hide table view (mobile — cards/calendar only). */
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
  const options = hideTableView
    ? VIEW_OPTIONS.filter((o) => o.value !== 'table')
    : VIEW_OPTIONS;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg border border-sidebar-border bg-card p-0.5',
        className,
      )}
    >
      {options.map(({ value: v, label, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            aria-label={`${label} view`}
            title={`${label} view`}
            className={cn(
              'inline-flex h-9 min-h-[44px] min-w-[40px] items-center justify-center rounded-md px-2 transition-all duration-150 lg:min-h-0',
              active
                ? 'interactive-primary-segment'
                : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
