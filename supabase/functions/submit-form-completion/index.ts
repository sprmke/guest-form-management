/**
 * submit-form-completion — Phase 2 Airbnb guest-form completion submit.
 * Stub so local `functions serve` can start (see airbnb-calendar-sync.md §6.5).
 */

import { jsonError, requireHttpMethod } from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('submit-form-completion', async (req) => {
  requireHttpMethod(req, 'POST');
  return jsonError(req, 'Guest form completion is not available yet', 501);
});
