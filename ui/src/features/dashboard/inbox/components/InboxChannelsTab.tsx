import { useState } from 'react';

import { Loader2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';

import { MetaLogo, PlatformLogo } from '@/features/dashboard/inbox/components/PlatformLogo';
import { platformLabel } from '@/features/dashboard/inbox/lib/inboxFormat';
import { isMetaSyncConnectionError } from '@/features/dashboard/inbox/lib/metaInboxSyncErrors';
import type {
  ComingSoonPlatform,
  InboxConnection,
  SocialPlatform,
} from '@/features/dashboard/inbox/types/inbox';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const COMING_SOON_ORDER: SocialPlatform[] = ['tiktok', 'airbnb'];

function webhookWarning(conn: InboxConnection | undefined): string | null {
  if (!conn || conn.status !== 'connected' || conn.isPreview) return null;
  if (conn.errorMessage && isMetaSyncConnectionError(conn.errorMessage)) return null;
  if (conn.webhookSubscribed === false) {
    return conn.errorMessage ?? 'Live messages may not arrive.';
  }
  return conn.errorMessage;
}

type Props = {
  connections: InboxConnection[];
  comingSoon: ComingSoonPlatform[];
  statusLoading?: boolean;
  statusError?: boolean;
  canManage: boolean;
  connecting: boolean;
  disconnecting: boolean;
  onConnectMeta: () => void;
  onDisconnectMeta: () => void;
};

function metaConnection(
  connections: InboxConnection[],
  platform: 'facebook' | 'instagram'
): InboxConnection | undefined {
  console.log('connections::', connections);
  return connections.find((c) => c.platform === platform);
}

function isMetaChannelConnected(conn: InboxConnection | undefined): boolean {
  return !!conn && conn.status === 'connected' && !conn.isPreview;
}

type MetaUiState = 'disconnected' | 'connected' | 'partial' | 'error';

function resolveMetaUiState(
  fb: InboxConnection | undefined,
  ig: InboxConnection | undefined
): MetaUiState {
  if (fb?.status === 'error') return 'error';
  const fbOk = isMetaChannelConnected(fb);
  const igOk = isMetaChannelConnected(ig);
  if (!fbOk && !igOk) return 'disconnected';
  if (fbOk && !igOk) return 'partial';
  return 'connected';
}

function MetaPlatformRow({
  platform,
  conn,
  metaState,
}: {
  platform: 'facebook' | 'instagram';
  conn: InboxConnection | undefined;
  metaState: MetaUiState;
}) {
  const connected = isMetaChannelConnected(conn);
  const webhookNote = webhookWarning(conn);

  let detail: string | null = null;
  if (
    conn?.status === 'error' &&
    conn.errorMessage &&
    !isMetaSyncConnectionError(conn.errorMessage)
  ) {
    detail = conn.errorMessage;
  } else if (connected && conn?.displayName) {
    detail = conn.displayName;
  } else if (platform === 'instagram' && metaState === 'partial') {
    detail = 'Not linked to your Facebook Page';
  } else if (metaState === 'disconnected') {
    detail = null;
  }

  return (
    <div className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
      <PlatformLogo platform={platform} size="xs" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm">{platformLabel(platform)}</p>
          {connected ? (
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          ) : (
            <span className="text-muted-foreground text-xs">Not connected</span>
          )}
        </div>
        {detail && (
          <p
            className={cn(
              'mt-0.5 truncate text-xs',
              conn?.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {detail}
          </p>
        )}
        {webhookNote && !detail?.includes(webhookNote) && (
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{webhookNote}</p>
        )}
      </div>
    </div>
  );
}

export function InboxChannelsTab({
  connections,
  comingSoon,
  statusLoading = false,
  statusError = false,
  canManage,
  connecting,
  disconnecting,
  onConnectMeta,
  onDisconnectMeta,
}: Props) {
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const fbConn = metaConnection(connections, 'facebook');
  const igConn = metaConnection(connections, 'instagram');
  const metaState = resolveMetaUiState(fbConn, igConn);
  const metaConnected = metaState !== 'disconnected';

  console.log({
    igConn,
    metaState,
    metaConnected,
  });

  const handleConnect = () => {
    if (statusLoading) return;
    if (statusError) {
      toast.error('Could not load channels. Refresh and try again.');
      return;
    }
    onConnectMeta();
  };

  const confirmDisconnect = () => {
    onDisconnectMeta();
    setDisconnectOpen(false);
  };

  const showConnect = canManage && metaState === 'disconnected';
  const showReconnect = canManage && (metaState === 'error' || metaState === 'partial');
  const showDisconnect = canManage && metaConnected;

  return (
    <>
      <ul className="divide-border border-border divide-y overflow-hidden rounded-lg border">
        <li className="px-3 py-3 sm:px-4 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <MetaLogo size="sm" className="shrink-0 pt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Meta</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {metaState === 'disconnected'
                    ? 'Connect Facebook Messenger and Instagram DMs'
                    : 'Facebook Messenger + Instagram DMs'}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
                {showConnect && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline-primary"
                    className="h-9 min-h-[44px] gap-1.5 px-3 sm:min-h-9"
                    disabled={connecting || statusLoading}
                    onClick={handleConnect}
                  >
                    {connecting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <Plug className="size-4" aria-hidden />
                        Connect Meta
                      </>
                    )}
                  </Button>
                )}
                {showReconnect && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 min-h-[44px] gap-1.5 px-3 sm:min-h-9"
                    disabled={connecting}
                    onClick={handleConnect}
                  >
                    {connecting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <RefreshCw className="size-4" aria-hidden />
                        Reconnect
                      </>
                    )}
                  </Button>
                )}
                {showDisconnect && (
                  <Button
                    type="button"
                    size="sm"
                    variant="soft-destructive"
                    className="h-9 min-h-[44px] gap-1.5 px-3 sm:min-h-9"
                    disabled={disconnecting}
                    onClick={() => setDisconnectOpen(true)}
                  >
                    {disconnecting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <Unplug className="size-4" aria-hidden />
                        Disconnect
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {metaConnected && (
            <div className="border-border/80 mt-3 border-t pl-4 pt-3">
              <MetaPlatformRow platform="facebook" conn={fbConn} metaState={metaState} />
              <MetaPlatformRow platform="instagram" conn={igConn} metaState={metaState} />
            </div>
          )}
        </li>

        {COMING_SOON_ORDER.map((platform) => {
          const conn = connections.find((c) => c.platform === platform);
          const soon = comingSoon.find((c) => c.platform === platform);
          const subtitle =
            conn?.displayName && conn.status === 'connected'
              ? conn.displayName
              : (soon?.reason ?? null);

          return (
            <li
              key={platform}
              className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlatformLogo platform={platform} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{platformLabel(platform)}</p>
                  {subtitle && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end sm:shrink-0">
                <span className="text-muted-foreground text-xs font-medium">
                  {conn?.status === 'connected' && conn.isPreview
                    ? 'Preview'
                    : soon
                      ? 'Soon'
                      : 'Soon'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle>Disconnect Meta?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Clears Facebook and Instagram conversations from this inbox.
          </p>
          <DialogFooter className="gap-1">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] sm:min-h-9"
              disabled={disconnecting}
              onClick={() => setDisconnectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px] sm:min-h-9"
              disabled={disconnecting}
              onClick={confirmDisconnect}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
