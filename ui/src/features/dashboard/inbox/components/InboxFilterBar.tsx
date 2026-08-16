import { SlidersHorizontal } from 'lucide-react';

import type { ThreadStatusFilter, ThreadTypeFilter } from '@/features/dashboard/inbox/types/inbox';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: ThreadStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
];

const TYPE_OPTIONS: { value: ThreadTypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'dm', label: 'Chats' },
  { value: 'comment', label: 'Comments' },
];

type Props = {
  statusFilter: ThreadStatusFilter;
  typeFilter: ThreadTypeFilter;
  onStatusFilter: (v: ThreadStatusFilter) => void;
  onTypeFilter: (v: ThreadTypeFilter) => void;
};

export function InboxFilterBar({ statusFilter, typeFilter, onStatusFilter, onTypeFilter }: Props) {
  const typeActive = typeFilter !== 'all';
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? 'All types';

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilter(opt.value)}
              className={cn(
                'min-h-[36px] shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:min-h-[32px]',
                active
                  ? 'bg-foreground/5 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={typeActive ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 min-h-[36px] shrink-0 gap-1.5 px-2.5 text-xs font-medium sm:min-h-[32px]"
            aria-label="Filter by message type"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{typeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(calc(100vw-24px),220px)] p-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeFilter(opt.value)}
              className={cn(
                'flex min-h-[44px] w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                typeFilter === opt.value
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground hover:bg-muted/60'
              )}
            >
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
