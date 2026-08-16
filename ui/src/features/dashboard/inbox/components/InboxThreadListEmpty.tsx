import { Plug, RefreshCw } from 'lucide-react';

import { MetaInboxSyncProgress } from '@/features/dashboard/inbox/components/MetaInboxSyncProgress';

import { Button } from '@/components/ui/button';

type Props = {
  variant:
    'not-connected' | 'syncing' | 'sync-error' | 'empty' | 'search-not-loaded' | 'search-empty';
  canConnect: boolean;
  syncError?: string | null;
  syncLoadedCount?: number;
  onConnect?: () => void;
};

export function InboxThreadListEmpty({
  variant,
  canConnect,
  syncError,
  syncLoadedCount: _syncLoadedCount = 0,
  onConnect,
}: Props) {
  if (variant === 'not-connected') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">Connect Meta to receive messages.</p>
        {canConnect && onConnect && (
          <Button
            type="button"
            variant="outline-primary"
            size="sm"
            className="h-9 min-h-[44px] gap-1.5 px-3"
            onClick={onConnect}
          >
            <Plug className="size-4" aria-hidden />
            Connect
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'syncing') {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <MetaInboxSyncProgress className="w-full max-w-[220px] text-center" />
      </div>
    );
  }

  if (variant === 'sync-error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-destructive text-sm">{syncError ?? 'Could not load conversations.'}</p>
        {canConnect && onConnect && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-h-[44px] gap-1.5 px-3"
            onClick={onConnect}
          >
            <RefreshCw className="size-4" aria-hidden />
            Reconnect
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'search-not-loaded') {
    return (
      <p className="text-muted-foreground px-4 py-6 text-center text-sm">
        Search covers loaded conversations only. Older threads that haven&apos;t been scrolled into
        view aren&apos;t searchable yet.
      </p>
    );
  }

  if (variant === 'search-empty') {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm">
        No conversations match your search.
      </p>
    );
  }

  return <p className="text-muted-foreground p-6 text-center text-sm">No messages yet.</p>;
}
