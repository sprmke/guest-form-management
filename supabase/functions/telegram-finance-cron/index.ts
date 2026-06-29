/**
 * telegram-finance-cron — Hourly due-date reminders via pg_cron + pg_net.
 */

import {
  runFinanceDueReminders,
  verifyFinanceCronSecret,
} from "../_shared/telegramFinance.ts";
import { serveCronPost } from "../_shared/serveEdge.ts";

serveCronPost(
  "telegram-finance-cron",
  verifyFinanceCronSecret,
  runFinanceDueReminders,
);
