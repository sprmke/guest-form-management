/**
 * get-form-completion — Phase 2 Airbnb calendar-sync guest-form completion bootstrap.
 * Stub so local `functions serve` can start while Phase 2 implementation lands
 * (see docs/workflow/in-progress/airbnb-calendar-sync.md §6.5).
 *
 * GET ?complete=<token>
 */

import { jsonError, requireHttpMethod } from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('get-form-completion', async (req) => {
  requireHttpMethod(req, 'GET');
  return jsonError(req, 'Guest form completion is not available yet', 501);
});
