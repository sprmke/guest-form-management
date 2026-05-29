import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const usesNativeDatetimeUi =
      type === 'time' || type === 'date' || type === 'datetime-local';

    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-2xl border border-border/50 bg-muted/40 px-4 py-2 text-sm font-medium text-foreground ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/25',
          usesNativeDatetimeUi &&
            'ui-native-datetime box-border min-w-0 max-w-full py-0 leading-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
