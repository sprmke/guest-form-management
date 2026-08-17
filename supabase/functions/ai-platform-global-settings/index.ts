/**
 * ai-platform-global-settings — Super-admin GET/PATCH for platform-wide AI kill switch
 * and quota enforcement toggle.
 */

import {
  getAiPlatformGlobalSettings,
  setAiPlatformGlobalSettings,
  type AiFeature,
} from '../_shared/aiUsageService.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isValidFeatureList(value: unknown): value is AiFeature[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

serveSuperAdmin('ai-platform-global-settings', async (req, user) => {
  if (req.method === 'GET') {
    const data = await getAiPlatformGlobalSettings();
    return jsonSuccess(req, {
      enabled: data.enabled,
      enforceQuotas: data.enforceQuotas,
      allowedFeatures: data.allowedFeatures,
      defaultDailyCallLimit: data.defaultDailyCallLimit,
      defaultMonthlyCallLimit: data.defaultMonthlyCallLimit,
      defaultDailyCostUsdLimit: data.defaultDailyCostUsdLimit,
      creditUnitUsd: data.creditUnitUsd,
      voiceReceptionistCostPerMinuteUsd: data.voiceReceptionistCostPerMinuteUsd,
      defaultDailyCreditLimit: data.defaultDailyCreditLimit,
      defaultMonthlyCreditLimit: data.defaultMonthlyCreditLimit,
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
    if (body.allowedFeatures !== undefined && !isValidFeatureList(body.allowedFeatures)) {
      return jsonError(req, 'allowedFeatures must be an array of strings when provided', 400);
    }
    if (body.defaultDailyCallLimit !== undefined && !isPositiveInt(body.defaultDailyCallLimit)) {
      return jsonError(req, 'defaultDailyCallLimit must be a positive integer', 400);
    }
    if (
      body.defaultMonthlyCallLimit !== undefined &&
      !isPositiveInt(body.defaultMonthlyCallLimit)
    ) {
      return jsonError(req, 'defaultMonthlyCallLimit must be a positive integer', 400);
    }
    if (
      body.defaultDailyCostUsdLimit !== undefined &&
      (typeof body.defaultDailyCostUsdLimit !== 'number' || body.defaultDailyCostUsdLimit <= 0)
    ) {
      return jsonError(req, 'defaultDailyCostUsdLimit must be a positive number', 400);
    }
    if (
      body.creditUnitUsd !== undefined &&
      (typeof body.creditUnitUsd !== 'number' || body.creditUnitUsd <= 0)
    ) {
      return jsonError(req, 'creditUnitUsd must be a positive number', 400);
    }
    if (
      body.voiceReceptionistCostPerMinuteUsd !== undefined &&
      (typeof body.voiceReceptionistCostPerMinuteUsd !== 'number' ||
        body.voiceReceptionistCostPerMinuteUsd <= 0)
    ) {
      return jsonError(req, 'voiceReceptionistCostPerMinuteUsd must be a positive number', 400);
    }
    if (
      body.defaultDailyCreditLimit !== undefined &&
      (typeof body.defaultDailyCreditLimit !== 'number' || body.defaultDailyCreditLimit <= 0)
    ) {
      return jsonError(req, 'defaultDailyCreditLimit must be a positive number', 400);
    }
    if (
      body.defaultMonthlyCreditLimit !== undefined &&
      (typeof body.defaultMonthlyCreditLimit !== 'number' || body.defaultMonthlyCreditLimit <= 0)
    ) {
      return jsonError(req, 'defaultMonthlyCreditLimit must be a positive number', 400);
    }

    const data = await setAiPlatformGlobalSettings({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      enforceQuotas: typeof body.enforceQuotas === 'boolean' ? body.enforceQuotas : undefined,
      allowedFeatures: isValidFeatureList(body.allowedFeatures) ? body.allowedFeatures : undefined,
      defaultDailyCallLimit: isPositiveInt(body.defaultDailyCallLimit)
        ? body.defaultDailyCallLimit
        : undefined,
      defaultMonthlyCallLimit: isPositiveInt(body.defaultMonthlyCallLimit)
        ? body.defaultMonthlyCallLimit
        : undefined,
      defaultDailyCostUsdLimit:
        typeof body.defaultDailyCostUsdLimit === 'number'
          ? body.defaultDailyCostUsdLimit
          : undefined,
      creditUnitUsd: typeof body.creditUnitUsd === 'number' ? body.creditUnitUsd : undefined,
      voiceReceptionistCostPerMinuteUsd:
        typeof body.voiceReceptionistCostPerMinuteUsd === 'number'
          ? body.voiceReceptionistCostPerMinuteUsd
          : undefined,
      defaultDailyCreditLimit:
        typeof body.defaultDailyCreditLimit === 'number' ? body.defaultDailyCreditLimit : undefined,
      defaultMonthlyCreditLimit:
        typeof body.defaultMonthlyCreditLimit === 'number'
          ? body.defaultMonthlyCreditLimit
          : undefined,
      updatedBy: user.id,
    });
    return jsonSuccess(req, {
      enabled: data.enabled,
      enforceQuotas: data.enforceQuotas,
      allowedFeatures: data.allowedFeatures,
      defaultDailyCallLimit: data.defaultDailyCallLimit,
      defaultMonthlyCallLimit: data.defaultMonthlyCallLimit,
      defaultDailyCostUsdLimit: data.defaultDailyCostUsdLimit,
      creditUnitUsd: data.creditUnitUsd,
      voiceReceptionistCostPerMinuteUsd: data.voiceReceptionistCostPerMinuteUsd,
      defaultDailyCreditLimit: data.defaultDailyCreditLimit,
      defaultMonthlyCreditLimit: data.defaultMonthlyCreditLimit,
      updatedAt: data.updatedAt,
    });
  }

  return jsonError(req, 'Method not allowed', 405);
});
