import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 motion-safe:active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'gradient-primary text-primary-foreground shadow-soft hover:brightness-[1.03] hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/25 hover:shadow-md',
        outline:
          'border border-border/80 bg-card text-foreground shadow-sm shadow-black/[0.04] hover:bg-muted/55 hover:border-primary/35 hover:text-foreground active:bg-muted/70 dark:border-border/55 dark:bg-background/45 dark:text-foreground dark:shadow-none dark:hover:bg-muted/35 dark:hover:border-primary/30',
        secondary:
          'border border-border/75 bg-muted/50 text-foreground shadow-sm shadow-black/[0.03] hover:bg-muted/70 hover:border-border active:bg-muted/80 dark:border-border/50 dark:bg-muted/25 dark:hover:bg-muted/40',
        ghost:
          'text-foreground hover:bg-muted/55 hover:text-foreground dark:hover:bg-accent dark:hover:text-accent-foreground',
        link: 'font-medium text-primary underline-offset-4 hover:underline',
        success:
          'bg-success text-success-foreground hover:bg-success/90 shadow-sm shadow-success/25 hover:shadow-md',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-md px-3.5 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
