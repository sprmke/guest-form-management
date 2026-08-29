/**
 * issue-guest-form-completion-token — Phase 2 host mint of guest-form completion link.
 * Stub so local `functions serve` can start (see airbnb-calendar-sync.md §6.5).
 */

import { jsonError, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('issue-guest-form-completion-token', async (req) => {
  requireHttpMethod(req, 'POST');
  return jsonError(req, 'Guest form completion is not available yet', 501);
});
