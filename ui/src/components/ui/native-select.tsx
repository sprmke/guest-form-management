import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Matches booking edit inputs; hides the OS chevron and centers a custom icon. */
export const nativeSelectClassName =
  'h-11 w-full appearance-none rounded-lg border border-border/50 bg-muted/40 py-2 pl-4 pr-10 text-sm font-medium text-foreground ring-offset-background transition-colors focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/25';

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(nativeSelectClassName, className)}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden
    />
  </div>
));
NativeSelect.displayName = 'NativeSelect';
