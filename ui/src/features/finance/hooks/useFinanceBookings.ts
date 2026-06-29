import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { FinanceQuery } from "@/features/finance/lib/types";
import { fetchFinanceBookings } from "@/features/finance/hooks/useFinanceApi";

const FINANCE_BOOKINGS_KEY = ["finance-bookings"] as const;

export function useFinanceBookings(
  query: FinanceQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...FINANCE_BOOKINGS_KEY, query] as const,
    queryFn: () => fetchFinanceBookings(query),
    placeholderData: keepPreviousData,
    enabled:
      options?.enabled ?? (query.tab === "stays" || query.tab === "overview"),
  });
}
