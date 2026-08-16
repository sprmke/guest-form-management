/**
 * TTL expiry sweep for AI dashboard assistant Tier-2 pending actions — flips stale `pending`
 * rows to `expired` once `expires_at` has passed (15 minutes after proposal, per §4 of
 * docs/workflow/planned/ai-dashboard-assistant.md). Plan's phase 6 hardening item.
 */

import { createServiceClient } from './orgAuth.ts';

export function verifyDashboardAssistantExpireCronSecret(req: Request): boolean {
  const expected = Deno.env.get('DASHBOARD_ASSISTANT_EXPIRE_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-dashboard-assistant-expire-cron-secret')?.trim();
  return got === expected;
}

export async function runExpireDashboardAssistantPendingActions(): Promise<
  Record<string, unknown>
> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from('ai_dashboard_assistant_pending_actions')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', nowIso)
    .select('id');

  if (error) {
    throw new Error(`runExpireDashboardAssistantPendingActions: ${error.message}`);
  }

  return { expired: expired?.length ?? 0 };
}
