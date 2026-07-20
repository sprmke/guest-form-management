import { TelegramPlaceholdersReference } from '@/features/dashboard/bookings/components/TelegramPlaceholdersReference';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: string[];
  sampleVars?: Record<string, string>;
  onInsertToken?: (token: string) => void;
};

function placeholdersModalWidthClass(lineCount: number): string {
  if (lineCount > 36) return 'sm:max-w-[min(95vw,56rem)]';
  if (lineCount > 20) return 'sm:max-w-[min(95vw,52rem)]';
  return 'sm:max-w-[min(95vw,48rem)]';
}

/** Stacked above TelegramManageDialog (z-[110]+). Matches or exceeds parent template modal width. */
export function TelegramPlaceholdersNestedDialog({
  open,
  onOpenChange,
  lines,
  sampleVars,
  onInsertToken,
}: Props) {
  const widthClass = placeholdersModalWidthClass(lines.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'z-[111] max-h-[min(92dvh,780px)] gap-0 overflow-hidden p-0 sm:p-0',
          widthClass
        )}
        overlayClassName="z-[110]"
      >
        <DialogHeader className="border-border/60 border-b px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle className="text-base sm:text-lg">Placeholders</DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(calc(92dvh-8rem),680px)] overflow-y-auto px-4 py-4 sm:px-5">
          <TelegramPlaceholdersReference
            lines={lines}
            sampleVars={sampleVars}
            onInsertToken={onInsertToken}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
