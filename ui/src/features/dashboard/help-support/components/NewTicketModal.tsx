import { useCallback, useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';

import {
  TicketComposeForm,
  type TicketComposeStatus,
} from '@/features/dashboard/help-support/components/TicketComposeForm';

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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

const FORM_ID = 'new-support-ticket-form';

const IDLE_STATUS: TicketComposeStatus = {
  canSubmit: false,
  submitting: false,
  uploading: false,
  dirty: false,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (ticketId: string) => void;
};

export function NewTicketModal({ open, onOpenChange, onSubmitted }: Props) {
  const [status, setStatus] = useState<TicketComposeStatus>(IDLE_STATUS);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (open) return;
    setStatus(IDLE_STATUS);
    setDiscardOpen(false);
  }, [open]);

  const blocked = status.submitting || status.uploading;

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (blocked) return;
    if (status.dirty) {
      setDiscardOpen(true);
      return;
    }
    close();
  }, [blocked, close, status.dirty]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    requestClose();
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
        <ResponsiveModalContent
          sheetLayout="split"
          showCloseButton
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            if (blocked || discardOpen) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(event) => {
            if (blocked || discardOpen) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => {
            if (blocked || discardOpen) event.preventDefault();
          }}
          className={cn(
            'flex h-[min(90dvh,44rem)] max-h-[min(90dvh,44rem)] w-[min(calc(100vw-1.5rem),40rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
            'sm:h-[min(90dvh,44rem)] sm:max-h-[min(90dvh,44rem)] sm:w-[min(92vw,40rem)] sm:max-w-[40rem] sm:p-0'
          )}
        >
          <ResponsiveModalHeader className="border-border shrink-0 space-y-1 border-b px-5 pb-3.5 pr-14 pt-5 text-left sm:px-6">
            <ResponsiveModalTitle>New ticket</ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {open ? (
              <TicketComposeForm
                formId={FORM_ID}
                hideSubmit
                onStatusChange={setStatus}
                onSubmitted={onSubmitted}
              />
            ) : null}
          </div>

          <ResponsiveModalFooter className="border-border bg-background shrink-0 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="submit"
              form={FORM_ID}
              disabled={!status.canSubmit || blocked}
              className="min-h-11 w-full sm:w-auto"
            >
              {status.submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Submit
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent
          overlayClassName="z-[110] pointer-events-auto"
          className="pointer-events-auto z-[111] max-w-[min(calc(100vw-1.5rem),26rem)]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this ticket?</AlertDialogTitle>
            <AlertDialogDescription>Your draft will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({ variant: 'destructive' }),
                '!bg-destructive hover:!bg-destructive/90 min-h-11 [background-image:none]'
              )}
              onClick={close}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
