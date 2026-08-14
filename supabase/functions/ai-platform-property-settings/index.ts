/**
 * ai-platform-property-settings — Property-scoped GET/PATCH for AI platform overrides.
 * Auth: property team member (settings:view for GET, settings:edit for PATCH).
 */

import {
  getAiPlatformPropertySettings,
  upsertAiPlatformPropertySettings,
} from '../_shared/aiUsageService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('ai-platform-property-settings', async (req, user) => {
  const permission = req.method === 'GET' ? 'settings:view' : 'settings:edit';
  const { property } = await resolveScopedPropertyAccess(req, permission);

  if (req.method === 'GET') {
    const data = await getAiPlatformPropertySettings(property.id, property.organization_id);
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return jsonError(req, 'enabled must be a boolean when provided', 400);
    }
    const daily = body.dailyCallLimit !== undefined ? Number(body.dailyCallLimit) : undefined;
    const monthly = body.monthlyCallLimit !== undefined ? Number(body.monthlyCallLimit) : undefined;
    const dailyCost =
      body.dailyCostUsdLimit !== undefined ? Number(body.dailyCostUsdLimit) : undefined;
    if (
      daily !== undefined &&
      (!Number.isFinite(daily) || daily <= 0 || !Number.isInteger(daily))
    ) {
      return jsonError(req, 'dailyCallLimit must be a positive integer', 400);
    }
    if (
      monthly !== undefined &&
      (!Number.isFinite(monthly) || monthly <= 0 || !Number.isInteger(monthly))
    ) {
      return jsonError(req, 'monthlyCallLimit must be a positive integer', 400);
    }
    if (dailyCost !== undefined && (!Number.isFinite(dailyCost) || dailyCost <= 0)) {
      return jsonError(req, 'dailyCostUsdLimit must be a positive number', 400);
    }

    const data = await upsertAiPlatformPropertySettings({
      propertyId: property.id,
      organizationId: property.organization_id,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      dailyCallLimit: daily !== undefined ? (daily === null ? null : daily) : undefined,
      monthlyCallLimit: monthly !== undefined ? (monthly === null ? null : monthly) : undefined,
      dailyCostUsdLimit:
        dailyCost !== undefined ? (dailyCost === null ? null : dailyCost) : undefined,
      updatedBy: user.id,
    });
    return jsonSuccess(req, data);
  }

  return jsonError(req, 'Method not allowed', 405);
});
