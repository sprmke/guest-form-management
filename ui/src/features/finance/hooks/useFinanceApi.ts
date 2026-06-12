import { supabase } from "@/lib/supabaseClient";
import type {
  FinanceBookingLedgerRow,
  FinanceExportType,
  FinanceLineItem,
  FinanceQuery,
  FinanceReminderInterval,
  FinanceSummary,
  RecurrenceEditScope,
  RecurrenceInterval,
} from "@/features/finance/lib/types";
import { financeQueryToApiParams } from "@/features/finance/lib/financePeriod";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error("No admin session");
  return fetch(`${FUNCTIONS_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchFinanceSummary(
  query: FinanceQuery,
): Promise<FinanceSummary> {
  const params = financeQueryToApiParams(query);
  const res = await adminFetch(`/finance-summary?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load finance summary");
  }
  return json.data as FinanceSummary;
}

export async function fetchFinanceBookings(query: FinanceQuery): Promise<{
  rows: FinanceBookingLedgerRow[];
  total: number;
}> {
  const params = financeQueryToApiParams(query);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  params.set("sort", query.sort);
  const res = await adminFetch(`/finance-bookings?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load stays ledger");
  }
  return {
    rows: json.data as FinanceBookingLedgerRow[],
    total: json.total as number,
  };
}

export async function fetchFinanceLineItems(
  query: FinanceQuery,
  options?: { includeDueInRange?: boolean },
): Promise<FinanceLineItem[]> {
  const params = financeQueryToApiParams(query);
  if (options?.includeDueInRange) {
    params.set("include_due_in_range", "true");
  }
  const res = await adminFetch(`/finance-line-items?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load transactions");
  }
  return json.data as FinanceLineItem[];
}

export async function fetchRecurringSeriesItems(
  recurrenceSeriesId: string,
): Promise<FinanceLineItem[]> {
  const params = new URLSearchParams({
    recurrence_series_id: recurrenceSeriesId,
  });
  const res = await adminFetch(`/finance-line-items?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load recurring series");
  }
  return json.data as FinanceLineItem[];
}

export async function extendRecurringSeriesApi(input: {
  recurrence_series_id: string;
  direction: "before" | "after";
  extend_until: string;
}): Promise<{ rows: FinanceLineItem[]; created_count: number }> {
  const res = await adminFetch("/finance-line-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "extend_series", ...input }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to extend recurring series");
  }
  return {
    rows: json.data as FinanceLineItem[],
    created_count: (json.created_count as number) ?? 0,
  };
}

export type FinanceTelegramReminderPayload = {
  telegram_reminder_enabled: boolean;
  telegram_due_date?: string | null;
  telegram_days_before?: number;
  telegram_reminder_interval?: FinanceReminderInterval;
  telegram_message_template?: string | null;
  marked_paid?: boolean;
};

export async function createFinanceLineItemApi(
  input: {
    kind: "expense" | "income";
    label: string;
    amount: number;
    category?: string | null;
    occurred_on: string;
    notes?: string | null;
    recurrence_interval?: RecurrenceInterval | null;
    recurrence_until?: string | null;
  } & FinanceTelegramReminderPayload,
): Promise<{ row: FinanceLineItem; created_count: number }> {
  const res = await adminFetch("/finance-line-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to create transaction");
  }
  return {
    row: json.data as FinanceLineItem,
    created_count: (json.created_count as number) ?? 1,
  };
}

export async function updateFinanceLineItemApi(
  id: string,
  patch: Partial<
    {
      kind: "expense" | "income";
      label: string;
      amount: number;
      category: string | null;
      occurred_on: string;
      notes: string | null;
    } & FinanceTelegramReminderPayload
  >,
  scope: RecurrenceEditScope = "this",
): Promise<{ row: FinanceLineItem; updated_count: number }> {
  const res = await adminFetch("/finance-line-items", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, scope, ...patch }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to update transaction");
  }
  return {
    row: json.data as FinanceLineItem,
    updated_count: (json.updated_count as number) ?? 1,
  };
}

export async function deleteFinanceLineItemApi(
  id: string,
  scope: RecurrenceEditScope = "this",
): Promise<{ deleted_count: number }> {
  const params = new URLSearchParams({ id, scope });
  const res = await adminFetch(`/finance-line-items?${params.toString()}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to delete transaction");
  }
  return { deleted_count: (json.deleted_count as number) ?? 1 };
}

/** Fetch all stays matching filters (for PDF export; capped at 500 rows). */
export async function fetchAllFinanceBookings(
  query: FinanceQuery,
): Promise<FinanceBookingLedgerRow[]> {
  const params = financeQueryToApiParams(query);
  params.set("page", "1");
  params.set("limit", "100");
  const all: FinanceBookingLedgerRow[] = [];
  let page = 1;
  const maxPages = 5;
  while (page <= maxPages) {
    params.set("page", String(page));
    const res = await adminFetch(`/finance-bookings?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Failed to load stays for export");
    }
    const rows = json.data as FinanceBookingLedgerRow[];
    all.push(...rows);
    const total = json.total as number;
    if (all.length >= total || rows.length === 0) break;
    page += 1;
  }
  return all;
}

export async function downloadFinanceExport(
  query: FinanceQuery,
  type: FinanceExportType,
): Promise<{ blob: Blob; filename: string }> {
  const params = financeQueryToApiParams(query);
  params.set("type", type);
  const res = await adminFetch(`/finance-export?${params.toString()}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? "Export failed");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const fromHeader = cd?.match(/filename="([^"]+)"/)?.[1];
  return {
    blob,
    filename: fromHeader ?? `finance-${type}.csv`,
  };
}
