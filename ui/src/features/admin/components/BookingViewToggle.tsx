import { CalendarDays, LayoutGrid, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BookingView = 'table' | 'card' | 'calendar';

const VIEW_OPTIONS: {
  value: BookingView;
  label: string;
  Icon: typeof LayoutList;
}[] = [
  { value: 'table', label: 'Table', Icon: LayoutList },
  { value: 'card', label: 'Card', Icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', Icon: CalendarDays },
];

type Props = {
  value: BookingView;
  onChange: (next: BookingView) => void;
  /** Hide table view (mobile layout — cards/calendar only). */
  hideTableView?: boolean;
  className?: string;
};

/**
 * Icon-only segmented control for switching between table / card / calendar views.
 * Mirrors the icon-only viewMode toggle from
 * `property-management-app/apps/web/src/features/dashboard/property/payments/components/PaymentsToolbar.tsx`,
 * styled to match this project's `FilterBtn` look.
 */
export function BookingViewToggle({
  value,
  onChange,
  hideTableView = false,
  className,
}: Props) {
  const options = hideTableView
    ? VIEW_OPTIONS.filter((o) => o.value !== 'table')
    : VIEW_OPTIONS;

  return (
    <div
      role="group"
      aria-label="Choose booking view"
      className={cn(
        'inline-flex items-center rounded-lg border border-sidebar-border bg-card p-0.5 shrink-0',
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
              'inline-flex items-center justify-center rounded-md min-w-[40px] h-9 px-2 transition-all duration-150',
              active
                ? 'interactive-primary-segment'
                : 'text-sidebar-muted hover:text-primary hover:bg-primary/5',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
