/**
 * platform-settings — Super-admin GET/PUT for the `platform_settings` singleton:
 * signups on/off, maintenance mode + message, default plan code, support email,
 * legal URLs, public rate-limit ceiling. UI: `/admin/platform-settings`.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';
import { logSuperAdminAction } from '../_shared/superAdminAudit.ts';

function serialize(row: Record<string, unknown>) {
  return {
    defaultPlanCode: (row.default_plan_code as string | null) ?? null,
    signupsEnabled: row.signups_enabled !== false,
    maintenanceMode: row.maintenance_mode === true,
    maintenanceMessage: (row.maintenance_message as string | null) ?? null,
    supportEmail: (row.support_email as string | null) ?? null,
    legalTermsUrl: (row.legal_terms_url as string | null) ?? null,
    legalPrivacyUrl: (row.legal_privacy_url as string | null) ?? null,
    publicRateLimitPerMin: Number(row.public_rate_limit_per_min ?? 60),
    updatedAt: row.updated_at as string,
  };
}

function trimmedOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : null;
}

serveSuperAdmin('platform-settings', async (req, user) => {
  const supabase = createServiceClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) return jsonError(req, error.message, 500);
    if (!data) return jsonError(req, 'Platform settings not initialized', 500);
    return jsonSuccess(req, { settings: serialize(data as Record<string, unknown>) });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    requireHttpMethod(req, req.method);
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = { updated_by: user.id };

    if (body.signupsEnabled !== undefined) {
      if (typeof body.signupsEnabled !== 'boolean') {
        return jsonError(req, 'signupsEnabled must be a boolean');
      }
      patch.signups_enabled = body.signupsEnabled;
    }
    if (body.maintenanceMode !== undefined) {
      if (typeof body.maintenanceMode !== 'boolean') {
        return jsonError(req, 'maintenanceMode must be a boolean');
      }
      patch.maintenance_mode = body.maintenanceMode;
    }
    const maintenanceMessage = trimmedOrNull(body.maintenanceMessage);
    if (maintenanceMessage !== undefined) patch.maintenance_message = maintenanceMessage;
    const defaultPlanCode = trimmedOrNull(body.defaultPlanCode);
    if (defaultPlanCode !== undefined) patch.default_plan_code = defaultPlanCode;
    const supportEmail = trimmedOrNull(body.supportEmail);
    if (supportEmail !== undefined) patch.support_email = supportEmail;
    const legalTermsUrl = trimmedOrNull(body.legalTermsUrl);
    if (legalTermsUrl !== undefined) patch.legal_terms_url = legalTermsUrl;
    const legalPrivacyUrl = trimmedOrNull(body.legalPrivacyUrl);
    if (legalPrivacyUrl !== undefined) patch.legal_privacy_url = legalPrivacyUrl;
    if (body.publicRateLimitPerMin != null) {
      const n = Number(body.publicRateLimitPerMin);
      if (!Number.isInteger(n) || n < 1 || n > 10_000) {
        return jsonError(req, 'publicRateLimitPerMin must be 1–10000');
      }
      patch.public_rate_limit_per_min = n;
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .update(patch)
      .eq('id', 1)
      .select('*')
      .single();
    if (error) return jsonError(req, error.message, 500);

    await logSuperAdminAction(user, {
      action: 'platform.settings_update',
      targetType: 'platform',
      targetId: 'platform_settings',
      summary: 'Updated platform settings',
      metadata: { changed: Object.keys(patch).filter((k) => k !== 'updated_by') },
    });

    return jsonSuccess(req, { settings: serialize(data as Record<string, unknown>) });
  }

  return jsonError(req, 'Method not allowed', 405);
});
