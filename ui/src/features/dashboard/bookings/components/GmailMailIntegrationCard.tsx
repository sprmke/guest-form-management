import { useState } from 'react';

import { Unplug } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDisconnectGmailMail,
  useGmailMailIntegrationStatus,
  useStartGmailMailOAuth,
} from '@/features/dashboard/bookings/hooks/useGmailMailIntegration';

import { GoogleMark } from '@/components/branding/GoogleMark';
import { GmailMailIntegrationCardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

type Props = {
  /** `card` — standalone section; `nested` — inside Integrations Google block. */
  variant?: 'card' | 'nested';
};

export function GmailMailIntegrationCard({ variant = 'card' }: Props) {
  const { data, isLoading, isError, error, refetch } = useGmailMailIntegrationStatus();
  const startOAuth = useStartGmailMailOAuth();
  const disconnect = useDisconnectGmailMail();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const connected = data?.connected ?? false;
  const needsReconnect = data?.needsReconnect ?? false;
  const nested = variant === 'nested';

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setDisconnectOpen(false);
        toast.success('Google disconnected');
        void refetch();
      },
      onError: (e) => toast.error(friendlyToastError(e, 'Could not disconnect Google')),
    });
  };

  if (isLoading) {
    return <GmailMailIntegrationCardSkeleton embedded={nested} />;
  }

  const content = (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        !nested && 'bg-muted/20 rounded-lg px-3 py-3'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            'border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11',
            needsReconnect && 'border-amber-500/30 bg-amber-500/10'
          )}
        >
          <GoogleMark className="size-5 sm:size-[22px]" />
        </div>
        <div className="min-w-0">
          <h3
            id="gmail-integration-heading"
            className="text-sidebar-foreground text-sm font-bold sm:text-[13px]"
          >
            Google
          </h3>
          {isError && (
            <p className="text-destructive mt-1 text-xs">
              {String((error as Error)?.message ?? error)}
            </p>
          )}
          {!isError && connected && !needsReconnect && data?.googleAccountEmail && (
            <p className="mt-1 text-xs font-medium text-emerald-800 sm:text-[11px] dark:text-emerald-300">
              Connected as {data.googleAccountEmail}
            </p>
          )}
          {!isError && needsReconnect && data?.googleAccountEmail && (
            <p className="mt-1.5 text-xs font-medium text-amber-800/90 sm:text-[11px] dark:text-amber-200">
              {data.googleAccountEmail} — reconnect to restore sync.
            </p>
          )}
          {!isError && !connected && (
            <p className="mt-1.5 text-xs text-amber-800/90 sm:text-[11px] dark:text-amber-200">
              Not connected
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-wrap items-center gap-2 sm:shrink-0 sm:flex-row">
        <button
          type="button"
          disabled={startOAuth.isPending || disconnect.isPending}
          onClick={() => {
            startOAuth.mutate(undefined, {
              onError: (e) => toast.error(friendlyToastError(e, 'Could not connect Google')),
            });
          }}
          className={cn(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4',
            'border-primary/30 bg-primary/5 text-primary border text-sm font-semibold sm:w-auto sm:text-[13px]',
            'hover:border-primary/40 hover:bg-primary/10 transition-colors',
            'disabled:pointer-events-none disabled:opacity-40'
          )}
        >
          <GoogleMark className="size-4 shrink-0" />
          {connected ? 'Reconnect Google' : 'Connect Google'}
        </button>

        {connected ? (
          <button
            type="button"
            disabled={disconnect.isPending || startOAuth.isPending}
            onClick={() => setDisconnectOpen(true)}
            className={cn(
              'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3',
              'border-sidebar-border bg-background border text-sm font-semibold sm:w-auto sm:text-[13px]',
              'hover:bg-sidebar-accent/40 transition-colors',
              'disabled:pointer-events-none disabled:opacity-40'
            )}
          >
            <Unplug className="size-4 shrink-0" aria-hidden />
            Disconnect
          </button>
        ) : null}
      </div>
    </div>
  );

  const disconnectDialog = (
    <ResponsiveModal open={disconnectOpen} onOpenChange={setDisconnectOpen}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Disconnect Google?</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Gmail approval intake will stop for this property until you connect again. again.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={disconnect.isPending}
            onClick={() => setDisconnectOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={disconnect.isPending}
            onClick={() => handleDisconnect()}
          >
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );

  if (nested) {
    return (
      <>
        {content}
        {disconnectDialog}
      </>
    );
  }

  return (
    <section
      className={cn('surface-card w-full px-3 py-3 shadow-sm sm:px-4 sm:py-3.5')}
      aria-labelledby="gmail-integration-heading"
    >
      {content}
      {disconnectDialog}
    </section>
  );
}
