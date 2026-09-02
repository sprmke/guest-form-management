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
   *          Pass a definite height (e.g. `h-[92dvh]`) on tall sheets so
   *          `flex-1 min-h-0 overflow-y-auto` children scroll and footers stay pinned.
   *          Do not use `h-[min(92dvh,max-content)]` — mobile WebKit treats that as
   *          content height and scrolls the whole sheet.
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
      'flex min-h-0 w-full max-w-none flex-col overflow-hidden',
      /* Cap only — callers that need a scrollport (Admin More) pass explicit `h-[…dvh]`. */
      'max-h-[92dvh]',
      className,
      /* Always edge-to-edge — callers often pass Dialog-oriented max-w tokens. */
      '!inset-x-0 !w-full !max-w-none'
    )}
    {...props}
  >
    {layout === 'split' ? (
      /* Fills space under the drag handle so flex-1 + min-h-0 children get a real scrollport. */
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">{children}</div>
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
