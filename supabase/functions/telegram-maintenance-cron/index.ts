/**
 * telegram-maintenance-cron — Hourly maintenance reminders via pg_cron + pg_net.
 */

import {
  runMaintenanceDueReminders,
  verifyMaintenanceCronSecret,
} from "../_shared/telegramMaintenance.ts";
import { serveCronPost } from "../_shared/serveEdge.ts";

serveCronPost(
  "telegram-maintenance-cron",
  verifyMaintenanceCronSecret,
  runMaintenanceDueReminders,
);
