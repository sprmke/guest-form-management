import * as React from "react"
 
import { cn } from "@/lib/utils"
 
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
 
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-lg border border-input bg-white px-4 py-3 text-sm font-medium transition-all duration-200 ring-offset-white placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"
 
export { Textarea }