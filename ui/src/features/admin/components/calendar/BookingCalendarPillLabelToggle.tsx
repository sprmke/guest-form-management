import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BookingCalendarPillLabelMode = "name" | "price";

type Props = {
  value: BookingCalendarPillLabelMode;
  onChange: (next: BookingCalendarPillLabelMode) => void;
  className?: string;
};

export function BookingCalendarPillLabelToggle({
  value,
  onChange,
  className,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Calendar pill display"
      className={cn(
        "flex shrink-0 rounded-lg border border-border/60 p-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant={value === "name" ? "default" : "ghost"}
        size="sm"
        className="h-9 min-h-[44px] rounded-md px-2.5 text-[11px] sm:min-h-0 sm:h-7"
        onClick={() => onChange("name")}
        aria-pressed={value === "name"}
      >
        Name
      </Button>
      <Button
        type="button"
        variant={value === "price" ? "default" : "ghost"}
        size="sm"
        className="h-9 min-h-[44px] rounded-md px-2.5 text-[11px] sm:min-h-0 sm:h-7"
        onClick={() => onChange("price")}
        aria-pressed={value === "price"}
      >
        Price
      </Button>
    </div>
  );
}
