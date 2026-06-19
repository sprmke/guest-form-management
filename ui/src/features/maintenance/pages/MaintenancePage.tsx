import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Bell, Settings, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { MaintenancePeriodToolbar } from "@/features/maintenance/components/MaintenancePeriodToolbar";
import { MaintenanceExportMenu } from "@/features/maintenance/components/MaintenanceExportMenu";
import { MaintenanceOverviewTab } from "@/features/maintenance/components/MaintenanceOverviewTab";
import { MaintenanceRemindersTab } from "@/features/maintenance/components/MaintenanceRemindersTab";
import { MaintenanceSettingsTab } from "@/features/maintenance/components/MaintenanceSettingsTab";
import { useMaintenanceSummary } from "@/features/maintenance/hooks/useMaintenanceSummary";
import { useMaintenanceItems } from "@/features/maintenance/hooks/useMaintenanceItems";
import {
  parseMaintenanceQueryFromParams,
  rangeForPreset,
  writeMaintenanceQueryToParams,
  type MaintenanceRangePreset,
} from "@/features/maintenance/lib/maintenancePeriod";
import {
  useDateNavigation,
  useSyncDateRangeWithQuery,
} from "@/features/admin/hooks/useDateNavigation";
import { fromIsoDate } from "@/lib/dateNavigation";
import type {
  MaintenanceQuery,
  MaintenanceTab,
} from "@/features/maintenance/lib/types";

const TABS: {
  id: MaintenanceTab;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => {
    const parsed = parseMaintenanceQueryFromParams(searchParams);
    if (!parsed.from && !parsed.to && !searchParams.has("from")) {
      const thisMonth = rangeForPreset("this_month");
      return { ...parsed, ...thisMonth };
    }
    return parsed;
  }, [searchParams]);

  const setQuery = useCallback(
    (next: MaintenanceQuery, preset?: MaintenanceRangePreset) => {
      setSearchParams(writeMaintenanceQueryToParams(next, preset), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const initialFromDate = fromIsoDate(query.from);
  const initialToDate = fromIsoDate(query.to);
  const dateNav = useDateNavigation({
    initialPreset: "month",
    initialRange:
      initialFromDate && initialToDate
        ? { from: initialFromDate, to: initialToDate }
        : null,
  });

  useSyncDateRangeWithQuery(dateNav, query.from, query.to, (next) => {
    setQuery({ ...query, page: 1, from: next.from, to: next.to });
  });

  const handleClearDate = useCallback(() => {
    setQuery({ ...query, page: 1, from: null, to: null });
  }, [query, setQuery]);

  const summaryQuery = useMaintenanceSummary(query);
  const itemsQuery = useMaintenanceItems(query, { includeDueInRange: true });

  return (
    <AdminLayout>
      <div className="space-y-3 sm:space-y-4">
        <AdminPageHeader
          id="maintenance-heading"
          variant="compact"
          title="Maintenance"
          icon={Wrench}
          actions={
            <MaintenanceExportMenu
              query={query}
              summary={summaryQuery.data}
              items={itemsQuery.data}
            />
          }
        />

        <section className="surface-card w-full overflow-visible px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:gap-3 2xl:items-center">
            <div
              className={cn(
                "flex w-full min-w-0 gap-1",
                "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "xl:w-auto xl:shrink-0 xl:overflow-visible xl:pb-0",
              )}
              role="tablist"
              aria-label="Maintenance sections"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = query.tab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                      "max-sm:min-w-[4.5rem] max-sm:flex-1",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    onClick={() =>
                      setQuery({ ...query, tab: tab.id, page: 1, q: "" })
                    }
                  >
                    <Icon
                      className={cn(
                        "size-3.5",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full min-w-0 xl:min-w-0 xl:flex-1">
              <MaintenancePeriodToolbar
                query={query}
                onChange={setQuery}
                showSearch={query.tab === "reminders"}
                searchPlaceholder="Search reminders…"
                hideDateFilter={query.tab === "settings"}
                dateNav={dateNav}
                onClearDate={handleClearDate}
                align="end"
              />
            </div>
          </div>
        </section>

        {query.tab === "overview" ? (
          <MaintenanceOverviewTab
            summary={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
          />
        ) : null}

        {query.tab === "reminders" ? (
          <MaintenanceRemindersTab query={query} />
        ) : null}

        {query.tab === "settings" ? <MaintenanceSettingsTab /> : null}
      </div>
    </AdminLayout>
  );
}
