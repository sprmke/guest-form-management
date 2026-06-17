import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full resize-y rounded-lg border border-border/70 bg-card px-4 py-3 text-sm font-medium text-foreground shadow-[inset_0_1px_2px_hsl(240_6%_10%_/0.04)] ring-offset-background transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 dark:border-border/50 dark:bg-muted/40 dark:shadow-none dark:hover:border-primary/25',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
