/**
 * dashboard-assistant-settings — Org GET/PATCH for the AI dashboard assistant opt-in, per-property
 * disable list, and message/write-action quotas. Independent of ai-platform-settings (Phase A) —
 * see docs/workflow/planned/ai-dashboard-assistant.md §6.
 */

import {
  getDashboardAssistantGlobalSettings,
  getDashboardAssistantOrgSettings,
  getDashboardAssistantUsageSummary,
  upsertDashboardAssistantOrgSettings,
} from '../_shared/dashboardAssistantSettings.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import {
  listPropertyIdsForOrganization,
  resolveOrgAccessContext,
} from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

serveAuthenticated('dashboard-assistant-settings', async (req, user) => {
  if (req.method === 'GET') {
    // No permission gate on read — any org/property member needs this to know whether the
    // assistant launcher should render, not just settings-page-capable admins.
    const ctx = await resolveOrgAccessContext(req);
    const includeUsage = new URL(req.url).searchParams.get('includeUsage') === 'true';
    const [settings, global, usage] = await Promise.all([
      getDashboardAssistantOrgSettings(ctx.org.id),
      getDashboardAssistantGlobalSettings(),
      includeUsage ? getDashboardAssistantUsageSummary(ctx.org.id) : Promise.resolve(null),
    ]);
    return jsonSuccess(req, {
      ...settings,
      platformEnabled: global.enabled,
      usage,
    });
  }

  const ctx = await resolveOrgAccessContext(req, 'org.settings.aiAssistant:edit');

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return jsonError(req, 'enabled must be a boolean when provided', 400);
    }
    if (body.disabledPropertyIds !== undefined && !isUuidArray(body.disabledPropertyIds)) {
      return jsonError(req, 'disabledPropertyIds must be an array of strings when provided', 400);
    }
    if (body.dailyMessageLimit !== undefined && !isPositiveInt(body.dailyMessageLimit)) {
      return jsonError(req, 'dailyMessageLimit must be a positive integer', 400);
    }
    if (body.monthlyMessageLimit !== undefined && !isPositiveInt(body.monthlyMessageLimit)) {
      return jsonError(req, 'monthlyMessageLimit must be a positive integer', 400);
    }
    if (body.dailyWriteActionLimit !== undefined && !isPositiveInt(body.dailyWriteActionLimit)) {
      return jsonError(req, 'dailyWriteActionLimit must be a positive integer', 400);
    }

    if (isUuidArray(body.disabledPropertyIds) && body.disabledPropertyIds.length > 0) {
      const orgPropertyIds = new Set(await listPropertyIdsForOrganization(ctx.org.id));
      const invalid = body.disabledPropertyIds.filter((id) => !orgPropertyIds.has(id));
      if (invalid.length > 0) {
        return jsonError(
          req,
          `disabledPropertyIds must belong to this organization: ${invalid.join(', ')}`,
          400
        );
      }
    }

    const settings = await upsertDashboardAssistantOrgSettings({
      organizationId: ctx.org.id,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      disabledPropertyIds: isUuidArray(body.disabledPropertyIds)
        ? body.disabledPropertyIds
        : undefined,
      dailyMessageLimit: isPositiveInt(body.dailyMessageLimit) ? body.dailyMessageLimit : undefined,
      monthlyMessageLimit: isPositiveInt(body.monthlyMessageLimit)
        ? body.monthlyMessageLimit
        : undefined,
      dailyWriteActionLimit: isPositiveInt(body.dailyWriteActionLimit)
        ? body.dailyWriteActionLimit
        : undefined,
      updatedBy: user.id,
    });
    return jsonSuccess(req, settings);
  }

  return jsonError(req, 'Method not allowed', 405);
});
