import { Loader2, Mail, Save, UserRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateWithBroadcast: () => void;
  onUpdateWithOwnerEmail: () => void;
  onUpdateOnly: () => void;
};

export function PayParkingUpdateBroadcastDialog({
  open,
  pending,
  onOpenChange,
  onUpdateWithBroadcast,
  onUpdateWithOwnerEmail,
  onUpdateOnly,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update parking details</DialogTitle>
          <DialogDescription>
            Choose whether to notify Azure North parking owners again with a
            broadcast email, or save the changes without sending email.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            disabled={pending}
            onClick={onUpdateWithBroadcast}
          >
            {pending ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <Mail className="size-4 shrink-0" aria-hidden />
            )}
            Update and send broadcast email
          </Button>
          <Button
            type="button"
            className="min-h-[44px] w-full gap-2"
            disabled={pending}
            onClick={onUpdateWithOwnerEmail}
          >
            {pending ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <UserRound className="size-4 shrink-0" aria-hidden />
            )}
            Update and send to parking owner email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            disabled={pending}
            onClick={onUpdateOnly}
          >
            {pending ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <Save className="size-4 shrink-0" aria-hidden />
            )}
            Update details only
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
