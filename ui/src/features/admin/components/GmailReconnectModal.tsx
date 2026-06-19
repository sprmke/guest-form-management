import { Mail, MailWarning } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { friendlyToastError } from '@/lib/toastMessages';
import { useStartGmailMailOAuth } from '@/features/admin/hooks/useGmailMailIntegration';

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
          <div className="flex gap-3 items-start">
            <div
              className={
                isReconnect
                  ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'
              }
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <DialogTitle className="pt-1.5 text-left">
              {isReconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm leading-snug text-muted-foreground">
          {isReconnect
            ? 'Your Gmail connection expired or was revoked. Reconnect so the listener can process Azure approval emails.'
            : 'Connect Gmail so the listener can process Azure approval emails automatically.'}
        </p>

        <DialogFooter className="gap-2 pt-2 sm:gap-2">
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
                onError: (e) =>
                  toast.error(friendlyToastError(e, 'Could not connect Gmail')),
              });
            }}
          >
            {isReconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
