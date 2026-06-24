/**
 * Maintenance period helpers — Manila timezone presets and URL query sync.
 */

import type { MaintenanceQuery, MaintenanceTab } from "@/features/maintenance/lib/types";
import { DEFAULT_MAINTENANCE_QUERY } from "@/features/maintenance/lib/types";
import { parseAdminListView } from "@/features/admin/lib/listView";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  normalizeAdminPageLimit,
} from "@/lib/pagination";

export function manilaTodayIso(): string {
  const { y, m, d } = manilaDateParts();
  return isoFromParts(y, m, d);
}

function manilaDateParts(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "2026");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return { y, m, d };
}

function isoFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type MaintenanceRangePreset = "this_month" | "last_month" | "ytd" | "all";

export function rangeForPreset(preset: MaintenanceRangePreset): {
  from: string | null;
  to: string | null;
} {
  const { y, m, d } = manilaDateParts();
  if (preset === "all") return { from: null, to: null };
  if (preset === "this_month") {
    const lastDay = new Date(y, m, 0).getDate();
    return {
      from: isoFromParts(y, m, 1),
      to: isoFromParts(y, m, lastDay),
    };
  }
  if (preset === "last_month") {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const lastDay = new Date(prevY, prevM, 0).getDate();
    return {
      from: isoFromParts(prevY, prevM, 1),
      to: isoFromParts(prevY, prevM, lastDay),
    };
  }
  return { from: isoFromParts(y, 1, 1), to: isoFromParts(y, m, d) };
}

export function detectPreset(
  from: string | null,
  to: string | null,
): MaintenanceRangePreset | "custom" {
  for (const preset of ["this_month", "last_month", "ytd", "all"] as const) {
    const r = rangeForPreset(preset);
    if (r.from === from && r.to === to) return preset;
  }
  return "custom";
}

export function parseMaintenanceQueryFromParams(
  params: URLSearchParams,
): MaintenanceQuery {
  const tabRaw = params.get("tab");
  const tab: MaintenanceTab =
    tabRaw === "reminders" || tabRaw === "settings" ? tabRaw : "overview";
  const listView = parseAdminListView(params);
  const remindersView: MaintenanceQuery["remindersView"] =
    tab === "reminders" ? listView : DEFAULT_MAINTENANCE_QUERY.remindersView;

  return {
    tab,
    from: params.get("from"),
    to: params.get("to"),
    q: params.get("q") ?? "",
    page: Math.max(1, parseInt(params.get("page") ?? "1", 10)),
    limit: normalizeAdminPageLimit(
      parseInt(params.get("limit") ?? String(ADMIN_DEFAULT_PAGE_SIZE), 10),
    ),
    remindersView,
  };
}

export function writeMaintenanceQueryToParams(
  query: MaintenanceQuery,
  preset?: MaintenanceRangePreset,
): URLSearchParams {
  const p = new URLSearchParams();
  if (query.tab !== "overview") p.set("tab", query.tab);
  if (query.from) p.set("from", query.from);
  if (query.to) p.set("to", query.to);
  if (query.q.trim()) p.set("q", query.q.trim());
  if (query.page > 1) p.set("page", String(query.page));
  if (query.limit !== ADMIN_DEFAULT_PAGE_SIZE) {
    p.set("limit", String(query.limit));
  }
  if (query.tab === "reminders" && query.remindersView !== "table") {
    p.set("view", query.remindersView);
  }
  if (preset && preset !== "this_month") p.set("preset", preset);
  return p;
}

export function maintenanceQueryToApiParams(query: MaintenanceQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (query.from) p.set("from", query.from);
  if (query.to) p.set("to", query.to);
  if (query.q.trim()) p.set("q", query.q.trim());
  return p;
}
