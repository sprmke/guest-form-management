export type RecurrenceInterval =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type RecurrenceEditScope = "this" | "this_and_future" | "all";

export type FinanceReminderInterval =
  | "hourly"
  | "every_2_hours"
  | "every_4_hours"
  | "every_12_hours"
  | "daily_noon";

export const FINANCE_REMINDER_INTERVAL_OPTIONS: {
  value: FinanceReminderInterval;
  label: string;
  description: string;
}[] = [
  {
    value: "hourly",
    label: "Every hour",
    description:
      "Up to one reminder per hour in the days-before window through the due date.",
  },
  {
    value: "every_2_hours",
    label: "Every 2 hours",
    description: "Up to one reminder every 2 hours in that window.",
  },
  {
    value: "every_4_hours",
    label: "Every 4 hours",
    description: "Up to one reminder every 4 hours in that window.",
  },
  {
    value: "every_12_hours",
    label: "Every 12 hours",
    description: "Up to one reminder every 12 hours in that window.",
  },
  {
    value: "daily_noon",
    label: "Daily at 12:00 PM",
    description: "One reminder each day at noon, Manila time.",
  },
];

/** Coerce API/legacy values to a supported reminder interval. */
export function normalizeFinanceReminderInterval(
  interval: string | null | undefined,
): FinanceReminderInterval {
  const v =
    typeof interval === "string" ? interval.trim().toLowerCase() : interval;
  if (
    v === "hourly" ||
    v === "every_2_hours" ||
    v === "every_4_hours" ||
    v === "every_12_hours" ||
    v === "daily_noon"
  ) {
    return v;
  }
  if (v === "once" || v === "daily" || v === "weekly" || v === "until_paid") {
    return "daily_noon";
  }
  return "daily_noon";
}

export const RECURRENCE_INTERVAL_OPTIONS: {
  value: RecurrenceInterval;
  label: string;
}[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const RECURRENCE_SCOPE_OPTIONS: {
  value: RecurrenceEditScope;
  label: string;
  description: string;
}[] = [
  {
    value: "this",
    label: "This occurrence only",
    description: "Update or delete only the selected date.",
  },
  {
    value: "this_and_future",
    label: "This and future",
    description: "Apply from this date forward in the series.",
  },
  {
    value: "all",
    label: "All occurrences",
    description: "Apply to every past and future entry in the series.",
  },
];

export function recurrenceIntervalLabel(
  interval: RecurrenceInterval | string | null | undefined,
): string | null {
  if (!interval || interval === "none") return null;
  return (
    RECURRENCE_INTERVAL_OPTIONS.find((o) => o.value === interval)?.label ??
    interval
  );
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function addInterval(
  iso: string,
  interval: Exclude<RecurrenceInterval, "none">,
): string {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d);
  switch (interval) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly": {
      const day = date.getDate();
      date.setMonth(date.getMonth() + 1);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case "quarterly": {
      const day = date.getDate();
      date.setMonth(date.getMonth() + 3);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function subtractInterval(
  iso: string,
  interval: Exclude<RecurrenceInterval, "none">,
): string {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d);
  switch (interval) {
    case "daily":
      date.setDate(date.getDate() - 1);
      break;
    case "weekly":
      date.setDate(date.getDate() - 7);
      break;
    case "monthly": {
      const day = date.getDate();
      date.setMonth(date.getMonth() - 1);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case "quarterly": {
      const day = date.getDate();
      date.setMonth(date.getMonth() - 3);
      const last = daysInMonth(date.getFullYear(), date.getMonth() + 1);
      date.setDate(Math.min(day, last));
      break;
    }
    case "yearly":
      date.setFullYear(date.getFullYear() - 1);
      break;
  }
  return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Default target when extending a series earlier (12 steps back). */
export function suggestExtendBefore(
  seriesStart: string,
  interval: Exclude<RecurrenceInterval, "none">,
): string {
  let cur = seriesStart;
  for (let i = 0; i < 12; i += 1) cur = subtractInterval(cur, interval);
  return cur;
}

/** Default target when extending a series later (12 steps forward). */
export function suggestExtendAfter(
  seriesEnd: string,
  interval: Exclude<RecurrenceInterval, "none">,
): string {
  let cur = seriesEnd;
  for (let i = 0; i < 12; i += 1) cur = addInterval(cur, interval);
  return cur;
}

/** Suggested end date when creating a new recurring series. */
export function defaultRecurrenceUntil(
  start: string,
  interval: Exclude<RecurrenceInterval, "none">,
): string {
  if (interval === "daily") {
    let cur = start;
    for (let i = 0; i < 89; i++) cur = addInterval(cur, interval);
    return cur;
  }
  if (interval === "weekly") {
    let cur = start;
    for (let i = 0; i < 51; i++) cur = addInterval(cur, interval);
    return cur;
  }
  const { y, m, d } = parseIso(start);
  if (interval === "monthly" || interval === "quarterly") {
    const months = 24;
    const date = new Date(y, m - 1 + months, Math.min(d, 28));
    return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  return formatIso(y + 5, m, Math.min(d, daysInMonth(y + 5, m)));
}
