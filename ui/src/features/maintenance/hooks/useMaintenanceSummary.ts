import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { MaintenanceQuery } from "@/features/maintenance/lib/types";
import { fetchMaintenanceSummary } from "@/features/maintenance/hooks/useMaintenanceApi";

export const MAINTENANCE_SUMMARY_KEY = ["maintenance-summary"] as const;

export function useMaintenanceSummary(query: MaintenanceQuery) {
  return useQuery({
    queryKey: [...MAINTENANCE_SUMMARY_KEY, query.from, query.to] as const,
    queryFn: () => fetchMaintenanceSummary(query),
    placeholderData: keepPreviousData,
    enabled: query.tab === "overview" || query.tab === "reminders",
  });
}
