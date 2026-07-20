import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  size?: 'default' | 'wide' | 'full' | 'sidebar';
  bodyClassName?: string;
};

const sizeClass: Record<NonNullable<Props['size']>, string> = {
  default: 'sm:max-w-[min(90vw,28rem)]',
  wide: 'sm:max-w-[min(95vw,42rem)] max-h-[min(92dvh,720px)]',
  full: 'sm:max-w-[min(95vw,48rem)] max-h-[min(92dvh,780px)]',
  sidebar: 'sm:max-w-[min(96vw,56rem)] lg:max-w-[min(92vw,60rem)] max-h-[min(92dvh,820px)]',
};

export function TelegramManageDialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  headerAction,
  size = 'wide',
  bodyClassName,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClass[size], 'gap-0 overflow-hidden p-0 sm:p-0')}>
        <DialogHeader className="border-border/60 space-y-0 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        </DialogHeader>
        <div
          className={cn(
            'max-h-[min(calc(92dvh-8rem),640px)] overflow-y-auto px-4 py-4 sm:px-5',
            size === 'sidebar' &&
              'flex max-h-[min(calc(92dvh-7rem),680px)] flex-col overflow-hidden sm:px-5',
            bodyClassName
          )}
        >
          {children}
        </div>
        {footer ? (
          <DialogFooter className="border-border/60 border-t px-4 py-3 sm:px-5">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
