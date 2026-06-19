import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsBelowMd, useIsBelowXl } from "@/hooks/useMediaQuery";
import { BookingDateRangeFilter } from "@/features/admin/components/BookingDateRangeFilter";
import type { DateNavigationState } from "@/lib/dateNavigation";
import type { MaintenanceQuery } from "@/features/maintenance/lib/types";

type Props = {
  query: MaintenanceQuery;
  onChange: (next: MaintenanceQuery) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  dateNav: DateNavigationState;
  onClearDate: () => void;
  align?: "start" | "end";
  hideDateFilter?: boolean;
};

export function MaintenancePeriodToolbar({
  query,
  onChange,
  showSearch = false,
  searchPlaceholder = "Search…",
  dateNav,
  onClearDate,
  align = "end",
  hideDateFilter = false,
}: Props) {
  const isBelowMd = useIsBelowMd();
  const isBelowXl = useIsBelowXl();
  const [searchDraft, setSearchDraft] = useState(query.q);
  const searchMount = useRef(true);

  const isDateActive = !!(query.from || query.to);

  useEffect(() => {
    if (searchMount.current) {
      searchMount.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      if (searchDraft !== query.q) {
        onChange({ ...query, page: 1, q: searchDraft });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchDraft, query, onChange]);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  if (hideDateFilter) return null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5",
        "xl:flex-row xl:items-center xl:gap-2",
        align === "end" && "xl:justify-end",
        align === "start" && "xl:justify-start",
      )}
    >
      {showSearch ? (
        <div className="relative w-full min-w-0 xl:max-w-[24rem] xl:flex-1 2xl:max-w-[28rem]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            className={cn(
              "h-10 min-h-[44px] w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 text-[13px] text-foreground",
              searchDraft ? "pr-11" : "pr-3",
              "placeholder:text-muted-foreground",
              "transition-all duration-150",
              "focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              onClick={() => setSearchDraft("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2",
          "sm:flex-row sm:flex-wrap sm:items-center sm:gap-2",
          "xl:w-auto xl:shrink-0 xl:flex-nowrap",
        )}
      >
        <div
          className={cn(
            "min-w-0",
            isBelowMd || isBelowXl ? "w-full" : "shrink-0",
          )}
        >
          <BookingDateRangeFilter
            {...dateNav}
            isActive={isDateActive}
            onClear={onClearDate}
            fullWidth={isBelowMd || isBelowXl}
          />
        </div>
      </div>
    </div>
  );
}
