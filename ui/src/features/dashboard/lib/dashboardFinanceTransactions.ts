import { manilaTodayIso } from "@/features/finance/lib/financePeriod";
import { recurrenceIntervalLabel } from "@/features/finance/lib/recurrence";
import type { FinanceLineItem } from "@/features/finance/lib/types";
import type { DatePreset } from "@/lib/dateNavigation";

export type DashboardTransactionRow = {
  item: FinanceLineItem;
  dueDate: string;
  isRecurring: boolean;
  recurrenceLabel: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isPaid: boolean;
};

export function effectiveDueDate(item: FinanceLineItem): string {
  return item.telegram_due_date?.trim().slice(0, 10) || item.occurred_on;
}

function occurredInPeriod(
  item: FinanceLineItem,
  from: string,
  to: string,
): boolean {
  return item.occurred_on >= from && item.occurred_on <= to;
}

/** Year filters can surface many recurring rows; shorter presets stay compact. */
export function dashboardTransactionMaxRows(datePreset: DatePreset): number {
  if (datePreset === "year") return 10;
  if (datePreset === "week") return 5;
  return 6;
}

/** Same scope as Finance → Transactions: occurred_on in the selected range. */
export function buildDashboardTransactionRows(
  items: FinanceLineItem[],
  from: string,
  to: string,
): DashboardTransactionRow[] {
  const today = manilaTodayIso();
  const rows: DashboardTransactionRow[] = [];

  for (const item of items) {
    if (!occurredInPeriod(item, from, to)) continue;

    const dueDate = effectiveDueDate(item);
    const isRecurring = Boolean(item.recurrence_series_id);
    const isPaid = Boolean(item.paid_at);

    rows.push({
      item,
      dueDate,
      isRecurring,
      recurrenceLabel: recurrenceIntervalLabel(item.recurrence_interval),
      isOverdue: !isPaid && item.telegram_reminder_enabled && dueDate < today,
      isDueToday:
        !isPaid && item.telegram_reminder_enabled && dueDate === today,
      isPaid,
    });
  }

  return rows.sort((a, b) => {
    const byDue = a.dueDate.localeCompare(b.dueDate);
    if (byDue !== 0) return byDue;
    return a.item.label.localeCompare(b.item.label);
  });
}

/** Unpaid Telegram-reminder rows with occurred_on in range (matches Finance tab scope). */
export function countDashboardDueInPeriod(
  items: FinanceLineItem[],
  from: string,
  to: string,
): number {
  return items.filter((item) => {
    if (item.paid_at || !item.telegram_reminder_enabled) return false;
    if (!occurredInPeriod(item, from, to)) return false;
    const dueDate = effectiveDueDate(item);
    return dueDate >= from && dueDate <= to;
  }).length;
}

/** Recurring occurrences with occurred_on in the selected range. */
export function countDashboardRecurringInPeriod(
  items: FinanceLineItem[],
  from: string,
  to: string,
): number {
  return items.filter(
    (item) =>
      Boolean(item.recurrence_series_id) && occurredInPeriod(item, from, to),
  ).length;
}
