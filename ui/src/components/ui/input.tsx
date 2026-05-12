import * as React from "react"
 
import { cn } from "@/lib/utils"
 
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}
 
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const usesNativeDatetimeUi =
      type === "time" ||
      type === "date" ||
      type === "datetime-local"
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-white px-4 py-2 text-sm font-medium transition-all duration-200 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30",
          usesNativeDatetimeUi &&
            "ui-native-datetime box-border min-w-0 max-w-full py-0 leading-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
 
export { Input }