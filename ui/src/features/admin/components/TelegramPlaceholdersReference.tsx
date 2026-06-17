import { useMemo, useState } from 'react';
import { Check, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  enrichPlaceholderLines,
  filterPlaceholders,
  groupPlaceholders,
} from '@/features/admin/lib/telegramPlaceholderGroups';

type Props = {
  lines: string[];
  className?: string;
};

export function TelegramPlaceholdersReference({ lines, className }: Props) {
  const [query, setQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const enriched = useMemo(() => enrichPlaceholderLines(lines), [lines]);
  const filtered = useMemo(
    () => filterPlaceholders(enriched, query),
    [enriched, query],
  );
  const groups = useMemo(() => groupPlaceholders(filtered), [filtered]);

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      toast.success('Copied');
      window.setTimeout(() => {
        setCopiedToken((current) => (current === token ? null : current));
      }, 1600);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
        Tap to copy. Filled from live booking data on send.
      </p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tokens…"
          aria-label="Search placeholders"
          className={cn(
            'h-9 w-full rounded-lg border border-border/70 bg-card py-1.5 pl-8 pr-2.5 text-xs text-foreground',
            'placeholder:text-muted-foreground/70 shadow-[inset_0_1px_2px_hsl(240_6%_10%_/0.04)]',
            'transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30',
            'dark:border-border/50 dark:bg-muted/30 dark:shadow-none',
          )}
        />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-2.5 py-3 text-center text-[10px] text-muted-foreground sm:text-[11px]">
          No tokens match your search.
        </p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {groups.map(({ group, items }) => (
            <section
              key={group}
              aria-label={group}
              className="surface-card p-3 sm:p-4"
            >
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group}
              </h3>
              <ul className="grid grid-cols-1 gap-y-1 gap-x-4 sm:grid-cols-2">
                {items.map((item) => {
                  const copied = copiedToken === item.token;
                  return (
                    <li key={item.token}>
                      <button
                        type="button"
                        onClick={() => void copyToken(item.token)}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                          'hover:bg-muted/40',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <code className="block break-all font-mono text-[10px] font-semibold text-primary sm:text-[11px]">
                            {item.token}
                          </code>
                          <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                            {item.description}
                          </span>
                        </span>
                        <span
                          className="shrink-0 pt-0.5 text-muted-foreground"
                          aria-hidden
                        >
                          {copied ? (
                            <Check className="size-3.5 text-primary" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
