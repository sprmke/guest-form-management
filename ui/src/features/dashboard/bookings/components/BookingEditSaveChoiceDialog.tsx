import { AlertTriangle, RotateCcw, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  onSaveOnly: () => void;
  onSaveAndRevert: () => void;
};

export function BookingEditSaveChoiceDialog({
  open,
  onOpenChange,
  isSaving,
  onSaveOnly,
  onSaveAndRevert,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),26rem)] gap-5">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300"
              aria-hidden
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 space-y-1.5 pt-0.5">
              <DialogTitle className="text-left text-base sm:text-lg">
                Save changes
              </DialogTitle>
              <DialogDescription className="text-left text-[13px] leading-snug sm:text-sm">
                Guest or stay details changed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="min-h-[44px] h-auto w-full justify-start gap-3 px-4 py-3 text-left whitespace-normal"
            disabled={isSaving}
            onClick={onSaveAndRevert}
          >
            <RotateCcw className="size-4 shrink-0" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold leading-snug">
                Save & revert to Pending Review
              </span>
              <span className="text-xs font-normal text-primary-foreground/80">
                Clears doc progress; re-approval required
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] h-auto w-full justify-start gap-3 px-4 py-3 text-left whitespace-normal"
            disabled={isSaving}
            onClick={onSaveOnly}
          >
            <Save className="size-4 shrink-0" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold leading-snug">Save only</span>
              <span className="text-xs font-normal text-muted-foreground">
                Keeps {` `}
                <span className="font-medium text-foreground">current status</span>
              </span>
            </span>
          </Button>
        </div>

        <DialogFooter className="pt-0 sm:justify-center">
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
