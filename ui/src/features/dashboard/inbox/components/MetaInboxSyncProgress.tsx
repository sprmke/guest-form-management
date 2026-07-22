import { Loader2 } from 'lucide-react';

type Props = {
  loadedCount?: number;
  className?: string;
};

export function MetaInboxSyncProgress({ loadedCount = 0, className }: Props) {
  const label =
    loadedCount > 0 ? `Loading conversations… (${loadedCount} loaded)` : 'Loading conversations…';

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="bg-muted relative mt-2 h-1 w-full overflow-hidden rounded-full" aria-hidden>
        <div className="animate-meta-sync-slide bg-primary/70 absolute inset-y-0 left-0 w-2/5 rounded-full" />
      </div>
    </div>
  );
}
