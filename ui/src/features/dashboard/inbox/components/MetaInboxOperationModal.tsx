import { Unplug } from 'lucide-react';

import { MetaLogo } from '@/features/dashboard/inbox/components/PlatformLogo';

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

export type MetaInboxOperation = 'sync' | 'disconnect' | 'connect';

type Props = {
  open: boolean;
  operation: MetaInboxOperation;
  loadedCount?: number;
};

const COPY: Record<MetaInboxOperation, { title: string; description: string }> = {
  sync: {
    title: 'Loading conversations',
    description: 'Syncing from Meta. This may take a few minutes — keep this page open.',
  },
  disconnect: {
    title: 'Disconnecting Meta',
    description: 'Removing synced conversations. This may take a few minutes.',
  },
  connect: {
    title: 'Connecting Meta',
    description: 'Linking your Page. This may take a few minutes.',
  },
};

function OperationIcon({ operation }: { operation: MetaInboxOperation }) {
  if (operation === 'disconnect') {
    return (
      <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <Unplug className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
    );
  }

  return (
    <span className="bg-primary/10 flex size-14 items-center justify-center rounded-2xl">
      <MetaLogo size="md" className="size-10" />
    </span>
  );
}

export function MetaInboxOperationModal({ open, operation, loadedCount = 0 }: Props) {
  const copy = COPY[operation];
  const showLoadedCount = operation === 'sync' && loadedCount > 0;
  const statusMessage = showLoadedCount
    ? `${copy.title}. ${loadedCount} conversation${loadedCount === 1 ? '' : 's'} loaded.`
    : copy.title;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
      }}
    >
      <ResponsiveModalContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        aria-describedby="meta-inbox-operation-description"
        className="z-[111] max-w-[min(calc(100vw-1.5rem),22rem)] gap-0 overflow-hidden p-0 sm:max-w-[22rem]"
        overlayClassName="z-[110]"
      >
        <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center sm:px-7 sm:pb-8 sm:pt-9">
          <OperationIcon operation={operation} />

          <ResponsiveModalTitle
            id="meta-inbox-operation-title"
            className="mt-5 text-base font-semibold leading-snug"
          >
            {copy.title}
          </ResponsiveModalTitle>

          <ResponsiveModalDescription
            id="meta-inbox-operation-description"
            className="text-muted-foreground mt-2 max-w-[17rem] text-sm leading-relaxed"
          >
            {copy.description}
          </ResponsiveModalDescription>

          <div
            className="mt-7 w-full"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-labelledby="meta-inbox-operation-title"
          >
            <p className="sr-only">{statusMessage}</p>
            <div
              className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
              aria-hidden
            >
              <div className="animate-meta-sync-slide bg-primary absolute inset-y-0 left-0 w-2/5 rounded-full" />
            </div>
            <p
              className={cn(
                'text-muted-foreground mt-2.5 min-h-[1.125rem] text-xs tabular-nums',
                !showLoadedCount && 'invisible'
              )}
              aria-hidden={!showLoadedCount}
            >
              {showLoadedCount ? `${loadedCount} loaded` : '\u00a0'}
            </p>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
