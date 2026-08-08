/**
 * ai-platform-global-settings — Super-admin GET/PATCH for platform-wide AI kill switch
 * and quota enforcement toggle.
 */

import {
  getAiPlatformGlobalSettings,
  setAiPlatformGlobalSettings,
} from '../_shared/aiUsageService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('ai-platform-global-settings', async (req, user) => {
  if (req.method === 'GET') {
    const data = await getAiPlatformGlobalSettings();
    return jsonSuccess(req, {
      enabled: data.enabled,
      enforceQuotas: data.enforceQuotas,
      updatedAt: data.updatedAt,
    });
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return jsonError(req, 'enabled must be a boolean when provided', 400);
    }
    if (body.enforceQuotas !== undefined && typeof body.enforceQuotas !== 'boolean') {
      return jsonError(req, 'enforceQuotas must be a boolean when provided', 400);
    }
    const data = await setAiPlatformGlobalSettings({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      enforceQuotas: typeof body.enforceQuotas === 'boolean' ? body.enforceQuotas : undefined,
      updatedBy: user.id,
    });
    return jsonSuccess(req, {
      enabled: data.enabled,
      enforceQuotas: data.enforceQuotas,
      updatedAt: data.updatedAt,
    });
  }

  return jsonError(req, 'Method not allowed', 405);
});
