import { toast } from 'sonner';
import { MailWarning, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOAST_ID = 'admin-gmail-not-connected';

export function showGmailDisconnectedToast(openSettings: () => void) {
  toast.custom(
    (id) => (
      <div
        data-gmail-disconnected-toast=""
        role="alert"
        className={cn(
          'pointer-events-auto w-[min(440px,calc(100vw-32px))]',
          'rounded-xl border border-border bg-card text-card-foreground shadow-lg',
          'flex gap-3 p-4 sm:p-4',
          'border-l-[4px] border-l-[hsl(var(--warning))]',
        )}
      >
        <MailWarning
          className="size-5 shrink-0 text-[hsl(var(--warning))] mt-0.5"
          aria-hidden
        />
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold leading-tight text-foreground">
              Gmail isn&apos;t connected
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Connect Gmail in{' '}
              <span className="font-medium text-foreground/90">Settings</span>{' '}
              so the listener can process Azure approval emails automatically.
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              Bookings still work; steps that depend on the mailbox stay paused
              until Gmail is set up.
            </p>
          </div>

          <details className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground [&_summary]:cursor-pointer [&_summary]:select-none [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
            <summary className="font-medium text-foreground/85 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
              Using legacy server tokens instead?
            </summary>
            <p className="mt-2 pt-2 border-t border-border/60 leading-relaxed">
              If this deployment only uses the CLI flow (
              <code className="rounded bg-muted px-1 py-px font-mono text-[11px] text-foreground/90">
                npm run gmail-auth
              </code>
              ), you can dismiss this reminder.
            </p>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="default"
              className="min-h-[44px] touch-manipulation"
              onClick={() => {
                openSettings();
                toast.dismiss(id);
              }}
            >
              Open Settings
            </Button>
          </div>
        </div>

        <button
          type="button"
          className={cn(
            'shrink-0 self-start rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center',
            '-mr-1 -mt-1 sm:mt-0',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          )}
          aria-label="Dismiss notification"
          onClick={() => toast.dismiss(id)}
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    ),
    {
      id: TOAST_ID,
      duration: 14_000,
      closeButton: false,
    },
  );
}
