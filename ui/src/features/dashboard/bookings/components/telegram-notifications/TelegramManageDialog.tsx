import * as React from 'react';

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
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
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
        className={cn(sizeClass[size], 'flex flex-col gap-0 overflow-hidden p-0 sm:p-0')}
      >
        <ResponsiveModalHeader className="border-border/60 shrink-0 space-y-0 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <ResponsiveModalTitle className="text-base sm:text-lg">{title}</ResponsiveModalTitle>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        </ResponsiveModalHeader>
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-5',
            size === 'sidebar' && 'flex flex-col',
            bodyClassName
          )}
        >
          {children}
        </div>
        {footer ? (
          <ResponsiveModalFooter className="border-border/60 shrink-0 border-t px-4 py-3 sm:px-5">
            {footer}
          </ResponsiveModalFooter>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
