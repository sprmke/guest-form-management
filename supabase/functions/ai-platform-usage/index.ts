/**
 * ai-platform-usage — Org GET for AI usage summary (calls + estimated USD).
 */

import { getOrgAiUsageSummary } from '../_shared/aiUsageService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('ai-platform-usage', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const ctx = await resolveOrgAccessContext(req);
  const summary = await getOrgAiUsageSummary(ctx.org.id);

  return jsonSuccess(req, summary);
});
