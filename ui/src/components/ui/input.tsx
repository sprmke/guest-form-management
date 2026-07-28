import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'bg-background text-foreground ring-offset-background file:text-foreground placeholder:text-muted-foreground flex w-full rounded-lg border transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-input hover:border-muted-foreground/30 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
        filled:
          'bg-muted hover:bg-muted/80 focus-visible:bg-background focus-visible:ring-ring border-transparent focus-visible:ring-2 focus-visible:ring-offset-2',
        ghost: 'hover:bg-muted focus-visible:bg-muted border-transparent focus-visible:ring-0',
        error:
          'border-destructive/50 bg-destructive/5 focus-visible:ring-destructive focus-visible:ring-2 focus-visible:ring-offset-2',
      },
      inputSize: {
        default: 'h-10 px-3 py-2 text-sm',
        sm: 'h-8 px-2.5 py-1.5 text-xs',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, error, ...props }, ref) => {
    const computedVariant = error ? 'error' : variant;
    const usesNativeDatetimeUi = type === 'time' || type === 'date' || type === 'datetime-local';

    return (
      <input
        type={type}
        className={cn(
          inputVariants({ variant: computedVariant, inputSize }),
          usesNativeDatetimeUi && 'ui-native-datetime box-border min-w-0 py-0 leading-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
