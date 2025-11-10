import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-md hover:shadow-lg",
        destructive:
          "bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/95 hover:to-destructive/85 shadow-md hover:shadow-lg",
        outline:
          "border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary backdrop-blur-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary font-medium",
        success: "bg-gradient-to-r from-success via-success to-success/95 text-success-foreground hover:from-success/95 hover:via-success/90 hover:to-success/85 shadow-lg hover:shadow-xl hover:scale-[1.02]",
      },
      size: {
        default: "h-11 py-2 px-5",
        sm: "h-9 px-4 rounded-md text-xs",
        lg: "h-13 px-8 rounded-lg text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }