import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function PaymentSettingsSaveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'max-h-[min(90dvh,32rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto'
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm payment details</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
              <p>
                Please verify that your payment details are accurate and up to date before saving.
              </p>
              <p>
                These details will be used for all booking-related payments. Incorrect or outdated
                information may result in failed transfers, payments being sent to the wrong
                account, or guest disputes.
              </p>
              <p>
                By saving these details, you confirm that the information is accurate. Kame Homes is
                not responsible for any losses or issues resulting from incorrect or outdated
                payment information.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="min-h-[44px]" disabled={busy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-[44px]"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? 'Saving…' : 'Confirm and save'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
