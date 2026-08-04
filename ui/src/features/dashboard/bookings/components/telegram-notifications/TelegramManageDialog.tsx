import * as React from 'react';

import { X } from 'lucide-react';

import {
  Dialog,
  DialogClose,
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
      <DialogContent
        showCloseButton={false}
        className={cn(
          sizeClass[size],
          'flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:p-0'
        )}
      >
        <DialogHeader className="border-border/60 space-y-0 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <DialogTitle className="min-w-0 flex-1 text-base sm:text-lg">{title}</DialogTitle>
            {headerAction ? (
              <div className="flex shrink-0 items-center gap-2">{headerAction}</div>
            ) : null}
            <DialogClose
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label="Close"
            >
              <X className="size-5 shrink-0" aria-hidden />
            </DialogClose>
          </div>
        </DialogHeader>
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5',
            !footer && 'max-h-[min(calc(92dvh-8rem),640px)]',
            size === 'sidebar' && 'flex flex-col sm:px-5',
            bodyClassName
          )}
        >
          {children}
        </div>
        {footer ? (
          <DialogFooter className="border-border/60 bg-background shrink-0 border-t px-4 py-3 sm:px-5">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
