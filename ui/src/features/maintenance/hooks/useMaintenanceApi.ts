import { supabase } from "@/lib/supabaseClient";
import type {
  FinanceReminderInterval,
  RecurrenceEditScope,
  RecurrenceInterval,
} from "@/features/finance/lib/recurrence";
import type {
  MaintenanceItem,
  MaintenanceQuery,
  MaintenanceSummary,
} from "@/features/maintenance/lib/types";
import { maintenanceQueryToApiParams } from "@/features/maintenance/lib/maintenancePeriod";

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

export async function fetchMaintenanceSummary(
  query: MaintenanceQuery,
): Promise<MaintenanceSummary> {
  const params = maintenanceQueryToApiParams(query);
  params.set("include_due_in_range", "true");
  const res = await adminFetch(`/maintenance-summary?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load maintenance summary");
  }
  return json.data as MaintenanceSummary;
}

export async function fetchMaintenanceItems(
  query: MaintenanceQuery,
  options?: { includeDueInRange?: boolean },
): Promise<MaintenanceItem[]> {
  const params = maintenanceQueryToApiParams(query);
  if (options?.includeDueInRange) {
    params.set("include_due_in_range", "true");
  }
  const res = await adminFetch(`/maintenance-items?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load maintenance items");
  }
  return json.data as MaintenanceItem[];
}

export async function fetchRecurringSeriesItems(
  recurrenceSeriesId: string,
): Promise<MaintenanceItem[]> {
  const params = new URLSearchParams({
    recurrence_series_id: recurrenceSeriesId,
  });
  const res = await adminFetch(`/maintenance-items?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to load recurring series");
  }
  return json.data as MaintenanceItem[];
}

export async function extendRecurringSeriesApi(input: {
  recurrence_series_id: string;
  direction: "before" | "after";
  extend_until: string;
}): Promise<{ rows: MaintenanceItem[]; created_count: number }> {
  const res = await adminFetch("/maintenance-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "extend_series", ...input }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to extend recurring series");
  }
  return {
    rows: json.data as MaintenanceItem[],
    created_count: (json.created_count as number) ?? 0,
  };
}

export type MaintenanceTelegramReminderPayload = {
  telegram_reminder_enabled: boolean;
  telegram_due_date?: string | null;
  telegram_days_before?: number;
  telegram_reminder_interval?: FinanceReminderInterval;
  telegram_message_template?: string | null;
  marked_complete?: boolean;
};

export async function createMaintenanceItemApi(
  input: {
    label: string;
    category: string;
    scheduled_on: string;
    notes?: string | null;
    recurrence_interval?: RecurrenceInterval | null;
    recurrence_until?: string | null;
  } & MaintenanceTelegramReminderPayload,
): Promise<{ row: MaintenanceItem; created_count: number }> {
  const res = await adminFetch("/maintenance-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to create reminder");
  }
  return {
    row: json.data as MaintenanceItem,
    created_count: (json.created_count as number) ?? 1,
  };
}

export async function updateMaintenanceItemApi(
  id: string,
  patch: Partial<
    {
      label: string;
      category: string;
      scheduled_on: string;
      notes: string | null;
    } & MaintenanceTelegramReminderPayload
  >,
  scope: RecurrenceEditScope = "this",
): Promise<{ row: MaintenanceItem; updated_count: number }> {
  const res = await adminFetch("/maintenance-items", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, scope, ...patch }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to update reminder");
  }
  return {
    row: json.data as MaintenanceItem,
    updated_count: (json.updated_count as number) ?? 1,
  };
}

export async function deleteMaintenanceItemApi(
  id: string,
  scope: RecurrenceEditScope = "this",
): Promise<{ deleted_count: number }> {
  const params = new URLSearchParams({ id, scope });
  const res = await adminFetch(`/maintenance-items?${params.toString()}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to delete reminder");
  }
  return { deleted_count: (json.deleted_count as number) ?? 1 };
}
