/**
 * voice-receptionist-usage — Property-scoped read-only usage/cost summary for AI voice
 * receptionist sessions (last 30 days). Visibility only — not a full analytics product.
 * Auth: property team member (settings:view).
 */

import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { getVoiceReceptionistUsageSummary } from '../_shared/voiceReceptionistService.ts';

serveAuthenticated('voice-receptionist-usage', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const { property } = await resolveScopedPropertyAccess(req, 'settings:view');
  const data = await getVoiceReceptionistUsageSummary(property.id);
  return jsonSuccess(req, data);
});
