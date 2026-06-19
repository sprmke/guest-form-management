import type {
  RecurrenceInterval,
  FinanceReminderInterval,
} from "@/features/finance/lib/recurrence";

export type MaintenanceTab = "overview" | "reminders" | "settings";

export type MaintenanceQuery = {
  tab: MaintenanceTab;
  from: string | null;
  to: string | null;
  q: string;
  page: number;
  limit: number;
};

export const DEFAULT_MAINTENANCE_QUERY: MaintenanceQuery = {
  tab: "overview",
  from: null,
  to: null,
  q: "",
  page: 1,
  limit: 31,
};

export type MaintenanceSummary = {
  period: {
    from: string | null;
    to: string | null;
  };
  total: number;
  telegramEnabled: number;
  completed: number;
  pending: number;
  byCategory: { category: string; count: number }[];
};

export type MaintenanceItem = {
  id: string;
  label: string;
  category: string | null;
  scheduled_on: string;
  notes: string | null;
  recurrence_series_id: string | null;
  recurrence_interval: Exclude<RecurrenceInterval, "none"> | null;
  telegram_reminder_enabled: boolean;
  telegram_due_date: string | null;
  telegram_days_before: number;
  telegram_reminder_interval: FinanceReminderInterval;
  telegram_message_template: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceExportType = "overview" | "reminders" | "combined";

export type {
  RecurrenceEditScope,
  RecurrenceInterval,
  FinanceReminderInterval as MaintenanceReminderInterval,
} from "@/features/finance/lib/recurrence";
