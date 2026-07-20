import * as React from 'react';

import { TelegramPlaceholdersReference } from '@/features/dashboard/bookings/components/TelegramPlaceholdersReference';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: readonly string[];
  sampleVars?: Record<string, string>;
  onInsertToken?: (token: string) => void;
};

function placeholdersModalWidthClass(lineCount: number): string {
  if (lineCount > 36) return 'sm:max-w-[min(95vw,56rem)]';
  if (lineCount > 20) return 'sm:max-w-[min(95vw,52rem)]';
  return 'sm:max-w-[min(95vw,48rem)]';
}

export function PropertyTemplatePlaceholdersDialog({
  open,
  onOpenChange,
  lines,
  sampleVars,
  onInsertToken,
}: Props) {
  const widthClass = placeholdersModalWidthClass(lines.length);

  const handleInsertToken = React.useCallback(
    (token: string) => {
      onInsertToken?.(token);
      onOpenChange(false);
    },
    [onInsertToken, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-h-[min(92dvh,780px)] gap-0 overflow-hidden p-0 sm:p-0', widthClass)}
      >
        <DialogHeader className="border-border/60 border-b px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle className="text-base sm:text-lg">Placeholders</DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(calc(92dvh-8rem),680px)] overflow-y-auto px-4 py-4 sm:px-5">
          <TelegramPlaceholdersReference
            lines={[...lines]}
            sampleVars={sampleVars}
            onInsertToken={handleInsertToken}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
