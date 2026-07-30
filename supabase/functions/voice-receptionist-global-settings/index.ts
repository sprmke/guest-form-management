/**
 * voice-receptionist-global-settings — Super-admin GET/PATCH for the platform-wide kill
 * switch. When disabled, `voice-receptionist-start` refuses regardless of any property's
 * own opt-in.
 * Auth: SUPER_ADMIN_EMAILS only.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';
import {
  getGlobalVoiceReceptionistSettings,
  setGlobalVoiceReceptionistEnabled,
} from '../_shared/voiceReceptionistService.ts';

serveSuperAdmin('voice-receptionist-global-settings', async (req, user) => {
  if (req.method === 'GET') {
    const data = await getGlobalVoiceReceptionistSettings();
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (typeof body.enabled !== 'boolean') {
      return jsonError(req, 'enabled (boolean) is required', 400);
    }
    const data = await setGlobalVoiceReceptionistEnabled(body.enabled, user.id);
    return jsonSuccess(req, data);
  }

  return jsonError(req, 'Method not allowed', 405);
});
