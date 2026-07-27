import { useMemo, useState } from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type MessageLike = {
  id: string;
  body_text?: string | null;
};

export function filterThreadMessages<T extends MessageLike>(messages: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return messages;
  return messages.filter((message) => message.body_text?.toLowerCase().includes(q));
}

type Props = {
  messages: MessageLike[];
  onQueryChange: (query: string) => void;
  className?: string;
};

export function ChatInThreadSearch({ messages, onQueryChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matchCount = useMemo(() => filterThreadMessages(messages, query).length, [messages, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    onQueryChange('');
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('min-h-[44px] min-w-[44px] shrink-0', className)}
        aria-label="Search in conversation"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>
      <Input
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onQueryChange(next);
        }}
        placeholder="Search"
        className="h-10 min-h-[44px] flex-1"
        aria-label="Search in conversation"
        autoFocus
      />
      {query.trim() ? (
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {matchCount}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-[44px] min-w-[44px] shrink-0"
        aria-label="Close search"
        onClick={close}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
