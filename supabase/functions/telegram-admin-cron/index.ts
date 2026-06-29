/**
 * telegram-admin-cron — Hourly via pg_cron + pg_net.
 */

import {
  runAdminHourlyAlerts,
  verifyAdminCronSecret,
} from "../_shared/telegramAdmin.ts";
import { serveCronPost } from "../_shared/serveEdge.ts";

serveCronPost(
  "telegram-admin-cron",
  verifyAdminCronSecret,
  runAdminHourlyAlerts,
);
