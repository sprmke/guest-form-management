import { LayoutGrid, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinanceStaysView } from '@/features/finance/lib/types';

const VIEW_OPTIONS: {
  value: FinanceStaysView;
  label: string;
  Icon: typeof LayoutList;
}[] = [
  { value: 'table', label: 'Table', Icon: LayoutList },
  { value: 'card', label: 'Card', Icon: LayoutGrid },
];

type Props = {
  value: FinanceStaysView;
  onChange: (next: FinanceStaysView) => void;
  /** Hide table view (mobile — cards only). */
  hideTableView?: boolean;
  className?: string;
};

export function FinanceStaysViewToggle({
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
      aria-label="Choose stays view"
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
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
