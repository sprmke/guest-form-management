/**
 * super-admin-ai-usage — GET the platform AI cost console for `/admin/ai-usage`.
 * Daily spend trend + cost-by-feature + top orgs by spend + current quota breaches.
 * Read-only, super-admin only. Backs the numbers `super-admin-overview` only summarizes.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

const RANGE_DAYS: Record<string, number> = { '30d': 30, '90d': 90, '12mo': 365 };
const DEFAULT_DAILY_LIMIT = 200;
const DEFAULT_MONTHLY_LIMIT = 5000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

serveSuperAdmin('super-admin-ai-usage', async (req) => {
  requireHttpMethod(req, 'GET');
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '30d';
  const days = RANGE_DAYS[range] ?? 30;
  const now = new Date();
  const sinceDate = isoDate(new Date(now.getTime() - days * 86_400_000));
  const sinceIso = new Date(now.getTime() - days * 86_400_000).toISOString();
  const monthStart = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const today = isoDate(now);

  const [dailyRes, eventsRes, orgSettingsRes, orgsRes] = await Promise.all([
    supabase
      .from('ai_platform_usage_daily')
      .select('usage_date, call_count, estimated_cost_usd, organization_id')
      .gte('usage_date', sinceDate)
      .limit(100_000),
    supabase
      .from('ai_platform_usage_events')
      .select('feature, estimated_cost_usd, organization_id')
      .gte('created_at', sinceIso)
      .limit(100_000),
    supabase
      .from('ai_platform_org_settings')
      .select('organization_id, daily_call_limit, monthly_call_limit, enabled'),
    supabase.from('organizations').select('id, name, slug').limit(10_000),
  ]);

  const firstError =
    dailyRes.error ?? eventsRes.error ?? orgSettingsRes.error ?? orgsRes.error ?? null;
  if (firstError) return jsonError(req, firstError.message, 500);

  const orgById = new Map(
    (orgsRes.data ?? []).map((o) => [
      o.id as string,
      { name: o.name as string, slug: o.slug as string },
    ])
  );
  const settingsByOrg = new Map(
    (orgSettingsRes.data ?? []).map((s) => [
      s.organization_id as string,
      {
        dailyLimit: Number(s.daily_call_limit ?? DEFAULT_DAILY_LIMIT),
        monthlyLimit: Number(s.monthly_call_limit ?? DEFAULT_MONTHLY_LIMIT),
        enabled: s.enabled !== false,
      },
    ])
  );

  // Daily spend/calls trend (platform-wide)
  const byDate = new Map<string, { costUsd: number; calls: number }>();
  for (const row of dailyRes.data ?? []) {
    const key = row.usage_date as string;
    const bucket = byDate.get(key) ?? { costUsd: 0, calls: 0 };
    bucket.costUsd += Number(row.estimated_cost_usd ?? 0);
    bucket.calls += Number(row.call_count ?? 0);
    byDate.set(key, bucket);
  }
  const dailySeries = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      costUsd: Math.round(v.costUsd * 10_000) / 10_000,
      calls: v.calls,
    }));

  // Cost by feature
  const byFeature = new Map<string, { costUsd: number; calls: number }>();
  for (const ev of eventsRes.data ?? []) {
    const feature = (ev.feature as string) || 'other';
    const bucket = byFeature.get(feature) ?? { costUsd: 0, calls: 0 };
    bucket.costUsd += Number(ev.estimated_cost_usd ?? 0);
    bucket.calls += 1;
    byFeature.set(feature, bucket);
  }
  const featureBreakdown = Array.from(byFeature.entries())
    .map(([feature, v]) => ({
      feature,
      costUsd: Math.round(v.costUsd * 10_000) / 10_000,
      calls: v.calls,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  // Spend by org (from events — has org_id) + this-month day counts from daily rows
  const byOrg = new Map<string, { costUsd: number; calls: number }>();
  for (const ev of eventsRes.data ?? []) {
    const orgId = ev.organization_id as string;
    if (!orgId) continue;
    const bucket = byOrg.get(orgId) ?? { costUsd: 0, calls: 0 };
    bucket.costUsd += Number(ev.estimated_cost_usd ?? 0);
    bucket.calls += 1;
    byOrg.set(orgId, bucket);
  }

  const monthCallsByOrg = new Map<string, number>();
  const todayCallsByOrg = new Map<string, number>();
  for (const row of dailyRes.data ?? []) {
    const orgId = row.organization_id as string;
    const date = row.usage_date as string;
    const calls = Number(row.call_count ?? 0);
    if (date >= monthStart) monthCallsByOrg.set(orgId, (monthCallsByOrg.get(orgId) ?? 0) + calls);
    if (date === today) todayCallsByOrg.set(orgId, calls);
  }

  const topOrgs = Array.from(byOrg.entries())
    .map(([orgId, v]) => {
      const org = orgById.get(orgId);
      const settings = settingsByOrg.get(orgId);
      const dailyLimit = settings?.dailyLimit ?? DEFAULT_DAILY_LIMIT;
      const monthlyLimit = settings?.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT;
      const todayCalls = todayCallsByOrg.get(orgId) ?? 0;
      const monthCalls = monthCallsByOrg.get(orgId) ?? 0;
      return {
        organizationId: orgId,
        organizationName: org?.name ?? 'Unknown org',
        organizationSlug: org?.slug ?? null,
        costUsd: Math.round(v.costUsd * 10_000) / 10_000,
        calls: v.calls,
        aiEnabled: settings?.enabled ?? true,
        dailyLimit,
        monthlyLimit,
        todayCalls,
        monthCalls,
        overDaily: todayCalls > dailyLimit,
        overMonthly: monthCalls > monthlyLimit,
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 25);

  const quotaBreaches = topOrgs.filter((o) => o.overDaily || o.overMonthly);
  const totalCostUsd = dailySeries.reduce((sum, d) => sum + d.costUsd, 0);
  const totalCalls = dailySeries.reduce((sum, d) => sum + d.calls, 0);

  return jsonSuccess(req, {
    range,
    generatedAt: now.toISOString(),
    totals: {
      costUsd: Math.round(totalCostUsd * 100) / 100,
      calls: totalCalls,
      orgsWithUsage: byOrg.size,
      quotaBreaches: quotaBreaches.length,
    },
    dailySeries,
    featureBreakdown,
    topOrgs,
    quotaBreaches,
  });
});
