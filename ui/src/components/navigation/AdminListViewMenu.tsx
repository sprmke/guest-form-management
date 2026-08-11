import { Check, ChevronDown } from 'lucide-react';

import { useAdminToolbarMenuOpen } from '@/components/navigation/AdminToolbarMenuScope';
import { type AdminViewToggleOption } from '@/components/navigation/AdminViewToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  options: AdminViewToggleOption<T>[];
  hideValues?: T[];
  className?: string;
  ariaLabel?: string;
};

/** Desktop-friendly view picker — one compact trigger instead of a segmented strip. */
export function AdminListViewMenu<T extends string>({
  value,
  onChange,
  options,
  hideValues = [],
  className,
  ariaLabel = 'Choose list view',
}: Props<T>) {
  const [open, setOpen] = useAdminToolbarMenuOpen();
  const visible = hideValues.length
    ? options.filter((option) => !hideValues.includes(option.value))
    : options;
  const current = visible.find((option) => option.value === value) ?? visible[0];
  const CurrentIcon = current?.Icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'border-border bg-card text-foreground inline-flex h-10 min-h-[44px] min-w-0 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold',
            'hover:bg-muted/60 transition-colors',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            className
          )}
        >
          {CurrentIcon ? <CurrentIcon className="size-3.5 shrink-0" aria-hidden /> : null}
          <span className="truncate">{current?.label ?? 'View'}</span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10.5rem]">
        {visible.map(({ value: optionValue, label, Icon }) => {
          const selected = optionValue === value;
          return (
            <DropdownMenuItem
              key={optionValue}
              onSelect={() => onChange(optionValue)}
              className="gap-2"
              aria-checked={selected}
              role="menuitemradio"
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              {selected ? <Check className="text-primary size-3.5 shrink-0" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
