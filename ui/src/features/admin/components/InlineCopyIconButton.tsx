import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** 18×18px icon-only copy control, inline after value text. */
export function InlineCopyIconButton({
  "aria-label": ariaLabel,
  disabled,
  onClick,
}: {
  "aria-label": string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative top-px inline-flex shrink-0 items-center justify-center rounded border p-0 align-middle transition-colors ml-1",
        disabled
          ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/50"
          : "border-blue-200/80 bg-blue-50/90 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20",
      )}
      style={{ width: 18, height: 18, padding: 0 }}
      aria-label={ariaLabel}
    >
      <Copy className="size-2.5 shrink-0" aria-hidden />
    </button>
  );
}
