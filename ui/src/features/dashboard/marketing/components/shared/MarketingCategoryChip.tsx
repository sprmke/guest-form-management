import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MarketingSidebarMenuItem } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: string;
  selected?: boolean;
  onClick: () => void;
  menuItems?: MarketingSidebarMenuItem[];
  className?: string;
};

export function MarketingCategoryChip({ label, selected, onClick, menuItems, className }: Props) {
  const hasMenu = menuItems && menuItems.length > 0;

  return (
    <div className={cn('group/chip relative min-w-0', className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex min-h-[36px] w-full min-w-0 items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          selected
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'bg-background absolute right-0.5 top-0.5 size-5 min-h-[20px] min-w-[20px] rounded border shadow-sm',
                'opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within/chip:opacity-100 group-hover/chip:opacity-100',
                selected && 'opacity-100'
              )}
              aria-label={`${label} options`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-2.5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-[min(calc(100vw-24px),16rem)]">
            {menuItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={cn(item.destructive && 'text-destructive focus:text-destructive')}
                onClick={item.onSelect}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
