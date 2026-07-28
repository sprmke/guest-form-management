import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  fullWidth?: boolean;
};

/** Seamless horizontal control — shared borders, no gaps between items. */
export function ButtonGroup({ className, fullWidth, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn('inline-flex items-stretch -space-x-px', fullWidth && 'w-full', className)}
      {...props}
    />
  );
}

type ButtonGroupPosition = 'only' | 'first' | 'middle' | 'last';

type ButtonGroupItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  position?: ButtonGroupPosition;
  active?: boolean;
};

const itemBaseClass = cn(
  'border-border relative inline-flex min-h-[44px] items-center justify-center border',
  'bg-card text-[13px] font-semibold transition-colors duration-100',
  'hover:bg-muted/60',
  'focus-visible:ring-ring focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50'
);

const itemPositionClass: Record<ButtonGroupPosition, string> = {
  only: 'rounded-lg px-3 py-2.5',
  first: 'min-w-[44px] rounded-l-lg rounded-r-none px-0',
  middle: 'min-w-0 flex-1 rounded-none px-3 py-2.5',
  last: 'min-w-[44px] rounded-r-lg rounded-l-none px-0',
};

export const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  function ButtonGroupItem(
    { className, position = 'only', active = false, type = 'button', ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          itemBaseClass,
          itemPositionClass[position],
          active ? 'interactive-primary text-foreground z-[1]' : 'text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
