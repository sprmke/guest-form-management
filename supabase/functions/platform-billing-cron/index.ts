/**
 * platform-billing-cron — renewal links, past-due, suspension sweep.
 */

import { runPlatformBillingCycle } from '../_shared/subscriptionOrchestrator.ts';
import { serveCronPost } from '../_shared/serveEdge.ts';

function verifyPlatformBillingCronSecret(req: Request): boolean {
  const expected = Deno.env.get('PLATFORM_BILLING_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('X-Platform-Billing-Cron-Secret')?.trim();
  return got === expected;
}

serveCronPost('platform-billing-cron', verifyPlatformBillingCronSecret, runPlatformBillingCycle);
