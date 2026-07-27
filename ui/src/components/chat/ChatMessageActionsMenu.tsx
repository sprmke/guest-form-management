import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Props = {
  outbound: boolean;
  children: ReactNode;
  className?: string;
};

/** Compact ⋯ trigger — 44px tap target on touch, smaller on hover-capable viewports. */
export function ChatMessageActionsMenu({ outbound, children, className }: Props) {
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const dismissFromScroll = () => dismiss();
    let attached = false;

    const attachId = window.requestAnimationFrame(() => {
      attached = true;
      document.addEventListener('scroll', dismissFromScroll, true);
      document.addEventListener('wheel', dismissFromScroll, { capture: true, passive: true });
      window.addEventListener('resize', dismissFromScroll);
    });

    return () => {
      window.cancelAnimationFrame(attachId);
      if (!attached) return;
      document.removeEventListener('scroll', dismissFromScroll, true);
      document.removeEventListener('wheel', dismissFromScroll, true);
      window.removeEventListener('resize', dismissFromScroll);
    };
  }, [open, dismiss]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-muted-foreground/50 hover:text-muted-foreground focus-visible:ring-ring flex shrink-0 items-center justify-center rounded-full transition-[color,opacity,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2',
            'size-11 [@media(hover:hover)]:size-6',
            'opacity-80 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/msg:opacity-100 [@media(hover:hover)]:group-hover/msg:opacity-100',
            'hover:bg-muted/60 active:bg-muted/80',
            className
          )}
          aria-label="Message actions"
        >
          <MoreHorizontal className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={outbound ? 'end' : 'start'}
        side="top"
        sideOffset={6}
        className="z-[110]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
