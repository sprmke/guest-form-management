import { useState } from 'react';

import { Check, ChevronDown, Sparkles, X } from 'lucide-react';

import type { ActivityTimelineEntry } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';

import { cn } from '@/lib/utils';

type Props = {
  entries: ActivityTimelineEntry[];
};

function formatDuration(ms: number | undefined): string | null {
  if (ms == null || ms < 50) return null;
  if (ms < 1000) return `${Math.round(ms / 100) / 10}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ActivityTimelineBlock({ entries }: Props) {
  const safeEntries = entries ?? [];
  const [open, setOpen] = useState(safeEntries.length > 2);
  if (safeEntries.length === 0) return null;

  return (
    <div className="border-border/60 bg-muted/30 rounded-xl border">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
          What I did ({safeEntries.length})
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <ol className="border-border/60 space-y-0 border-t px-3 py-2">
          {safeEntries.map((entry) => {
            const duration = formatDuration(entry.durationMs);
            return (
              <li
                key={entry.id}
                className="flex min-h-[32px] items-start gap-2 py-1.5 text-xs first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {entry.status === 'failed' ? (
                    <X className="text-destructive size-3.5" aria-hidden />
                  ) : (
                    <Check className="text-primary size-3.5" aria-hidden />
                  )}
                </span>
                <span className="text-foreground min-w-0 flex-1 leading-snug">{entry.label}</span>
                {duration ? (
                  <span className="text-muted-foreground shrink-0 tabular-nums">{duration}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
