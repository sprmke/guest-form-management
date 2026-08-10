import { Mail, MailWarning } from 'lucide-react';
import { toast } from 'sonner';

import { useStartGmailMailOAuth } from '@/features/dashboard/bookings/hooks/useGmailMailIntegration';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

export type GmailReconnectModalMode = 'connect' | 'reconnect';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GmailReconnectModalMode;
};

export function GmailReconnectModal({ open, onOpenChange, mode }: Props) {
  const startOAuth = useStartGmailMailOAuth();
  const isReconnect = mode === 'reconnect';
  const Icon = isReconnect ? MailWarning : Mail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={
                isReconnect
                  ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg'
              }
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <DialogTitle className="pt-1.5 text-left">
              {isReconnect ? 'Reconnect Google' : 'Connect Google'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground text-sm leading-snug">
          {isReconnect
            ? 'Your Google connection expired or was revoked. Reconnect to restore Gmail approval intake.'
            : 'Connect Google for Gmail-based GAF and pet approval automation.'}
        </p>

        <DialogFooter className="gap-1 pt-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={startOAuth.isPending}
            onClick={() => onOpenChange(false)}
          >
            Later
          </Button>
          <Button
            type="button"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={startOAuth.isPending}
            onClick={() => {
              startOAuth.mutate(undefined, {
                onError: (e) => toast.error(friendlyToastError(e, 'Could not connect Google')),
              });
            }}
          >
            {isReconnect ? 'Reconnect Google' : 'Connect Google'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
