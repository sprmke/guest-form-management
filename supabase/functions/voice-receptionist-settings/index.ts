/**
 * voice-receptionist-settings — Property-scoped GET/PATCH for AI voice receptionist config.
 * Auth: property team member (settings:view for GET, settings:edit for PATCH).
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import {
  getVoiceReceptionistSettings,
  updateVoiceReceptionistSettings,
  validateVoiceReceptionistPatch,
} from '../_shared/voiceReceptionistService.ts';

serveAuthenticated('voice-receptionist-settings', async (req) => {
  const permission = req.method === 'GET' ? 'settings:view' : 'settings:edit';
  const { property } = await resolveScopedPropertyAccess(req, permission);

  if (req.method === 'GET') {
    const data = await getVoiceReceptionistSettings(property.id);
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const { patch, error } = validateVoiceReceptionistPatch(body);
    if (error) return jsonError(req, error, 400);
    const data = await updateVoiceReceptionistSettings(property.id, patch);
    return jsonSuccess(req, data);
  }

  return jsonError(req, 'Method not allowed', 405);
});
