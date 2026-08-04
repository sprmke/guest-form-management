import * as React from 'react';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type BottomSheetContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof SheetContent>,
  'side' | 'showHandle'
> & {
  /** Extra class on the scrollable body wrapper (`layout="scroll"` only). */
  bodyClassName?: string;
  /**
   * `scroll` — single padded scroll region (simple sheets).
   * `split` — no body wrapper; caller owns sticky header / scroll / footer.
   *          Uses a definite height so `flex-1 min-h-0 overflow-y-auto` children scroll
   *          (max-height alone often fails to create a scrollport on mobile WebKit).
   */
  layout?: 'scroll' | 'split';
};

/**
 * Bottom sheet defaulting `side="bottom"` with drag-handle + safe-area padding.
 * Built on the shared Sheet (Radix dialog) — no second gesture library.
 */
const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  BottomSheetContentProps
>(({ className, children, bodyClassName, layout = 'scroll', hideClose = true, ...props }, ref) => (
  <SheetContent
    ref={ref}
    side="bottom"
    hideClose={hideClose}
    showHandle
    className={cn(
      'min-h-0 w-full max-w-none',
      /**
       * Split: short when content is short (`max-content`), definite `92dvh` when
       * overflowing so `flex-1 min-h-0 overflow-y-auto` children can scroll.
       * max-height alone often clips without a scrollport on mobile WebKit.
       */
      layout === 'split' &&
        'flex h-[min(92dvh,max-content)] max-h-[min(92dvh,100%)] flex-col overflow-hidden',
      /* Scroll layout: same max-content height trick so the flex-1 body scrolls when tall. */
      layout === 'scroll' && 'flex h-[min(92dvh,max-content)] max-h-[min(92dvh,100%)] flex-col',
      className,
      /* Always edge-to-edge — callers often pass Dialog-oriented max-w tokens. */
      '!inset-x-0 !w-full !max-w-none'
    )}
    {...props}
  >
    {layout === 'split' ? (
      children
    ) : (
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 [-webkit-overflow-scrolling:touch]',
          bodyClassName
        )}
      >
        {children}
      </div>
    )}
  </SheetContent>
));
BottomSheetContent.displayName = 'BottomSheetContent';

export {
  Sheet as BottomSheet,
  SheetTrigger as BottomSheetTrigger,
  SheetClose as BottomSheetClose,
  BottomSheetContent,
  SheetHeader as BottomSheetHeader,
  SheetFooter as BottomSheetFooter,
  SheetTitle as BottomSheetTitle,
  SheetDescription as BottomSheetDescription,
};
