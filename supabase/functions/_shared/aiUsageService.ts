/**
 * Platform AI usage metering, org quotas, and cost estimation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { type AiFeature, estimateTokenCostUsd, getModelConfig } from './aiModelRouter.ts';

export class AiQuotaExceededError extends Error {
  readonly code = 'AI_QUOTA_EXCEEDED';
  readonly upgradeHook = true;

  constructor(message = 'AI usage limit reached for this organization') {
    super(message);
    this.name = 'AiQuotaExceededError';
  }
}

export class AiPlatformDisabledError extends Error {
  readonly code = 'AI_PLATFORM_DISABLED';

  constructor(message = 'AI features are temporarily unavailable') {
    super(message);
    this.name = 'AiPlatformDisabledError';
  }
}

const DEFAULT_DAILY_LIMIT = 200;
const DEFAULT_MONTHLY_LIMIT = 5000;

function db() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartUtcDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export type AiPlatformGlobalSettings = {
  enabled: boolean;
  enforceQuotas: boolean;
  updatedAt: string | null;
};

export type AiPlatformOrgSettings = {
  organizationId: string;
  enabled: boolean;
  dailyCallLimit: number;
  monthlyCallLimit: number;
  planTier: string;
  updatedAt: string | null;
};

export type AiUsageSummary = {
  todayCallCount: number;
  monthCallCount: number;
  todayEstimatedCostUsd: number;
  monthEstimatedCostUsd: number;
  dailyCallLimit: number;
  monthlyCallLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  planTier: string;
  quotaExceeded: boolean;
};

export type RecordAiUsageInput = {
  organizationId: string;
  propertyId?: string | null;
  feature: AiFeature;
  provider: 'gemini' | 'groq';
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

export async function getAiPlatformGlobalSettings(): Promise<AiPlatformGlobalSettings> {
  const sb = db();
  const { data, error } = await sb
    .from('ai_platform_global_settings')
    .select('enabled, enforce_quotas, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    enabled: data?.enabled !== false,
    enforceQuotas: data?.enforce_quotas !== false,
    updatedAt: (data?.updated_at as string | null) ?? null,
  };
}

export async function setAiPlatformGlobalSettings(input: {
  enabled?: boolean;
  enforceQuotas?: boolean;
  updatedBy: string;
}): Promise<AiPlatformGlobalSettings> {
  const sb = db();
  const patch: Record<string, unknown> = { updated_by: input.updatedBy };
  if (typeof input.enabled === 'boolean') patch.enabled = input.enabled;
  if (typeof input.enforceQuotas === 'boolean') patch.enforce_quotas = input.enforceQuotas;

  const { data, error } = await sb
    .from('ai_platform_global_settings')
    .update(patch)
    .eq('id', 1)
    .select('enabled, enforce_quotas, updated_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    enabled: data?.enabled !== false,
    enforceQuotas: data?.enforce_quotas !== false,
    updatedAt: (data?.updated_at as string | null) ?? null,
  };
}

export async function getAiPlatformOrgSettings(
  organizationId: string
): Promise<AiPlatformOrgSettings> {
  const sb = db();
  const { data, error } = await sb
    .from('ai_platform_org_settings')
    .select('organization_id, enabled, daily_call_limit, monthly_call_limit, plan_tier, updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return {
    organizationId,
    enabled: data?.enabled !== false,
    dailyCallLimit: Number(data?.daily_call_limit ?? DEFAULT_DAILY_LIMIT),
    monthlyCallLimit: Number(data?.monthly_call_limit ?? DEFAULT_MONTHLY_LIMIT),
    planTier: String(data?.plan_tier ?? 'included'),
    updatedAt: (data?.updated_at as string | null) ?? null,
  };
}

export async function upsertAiPlatformOrgSettings(input: {
  organizationId: string;
  enabled?: boolean;
  dailyCallLimit?: number;
  monthlyCallLimit?: number;
  updatedBy: string;
}): Promise<AiPlatformOrgSettings> {
  const sb = db();
  const row: Record<string, unknown> = {
    organization_id: input.organizationId,
    updated_by: input.updatedBy,
  };
  if (typeof input.enabled === 'boolean') row.enabled = input.enabled;
  if (typeof input.dailyCallLimit === 'number') row.daily_call_limit = input.dailyCallLimit;
  if (typeof input.monthlyCallLimit === 'number') row.monthly_call_limit = input.monthlyCallLimit;

  const { error } = await sb.from('ai_platform_org_settings').upsert(row, {
    onConflict: 'organization_id',
  });
  if (error) throw new Error(error.message);
  return getAiPlatformOrgSettings(input.organizationId);
}

export async function resolveOrgIdForProperty(propertyId: string): Promise<string | null> {
  const sb = db();
  const { data, error } = await sb
    .from('properties')
    .select('organization_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (error) {
    console.error('[aiUsageService] resolveOrgIdForProperty:', error.message);
    return null;
  }
  return (data?.organization_id as string | null) ?? null;
}

async function sumMonthCallCount(organizationId: string): Promise<number> {
  const sb = db();
  const { data, error } = await sb
    .from('ai_platform_usage_daily')
    .select('call_count')
    .eq('organization_id', organizationId)
    .gte('usage_date', monthStartUtcDate());
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.call_count ?? 0), 0);
}

async function sumMonthCostUsd(organizationId: string): Promise<number> {
  const sb = db();
  const { data, error } = await sb
    .from('ai_platform_usage_daily')
    .select('estimated_cost_usd')
    .eq('organization_id', organizationId)
    .gte('usage_date', monthStartUtcDate());
  if (error) throw new Error(error.message);
  const total = (data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0);
  return Math.round(total * 1_000_000) / 1_000_000;
}

export async function getOrgAiUsageSummary(organizationId: string): Promise<AiUsageSummary> {
  const orgSettings = await getAiPlatformOrgSettings(organizationId);
  const sb = db();
  const today = todayUtcDate();

  const { data: todayRow, error: todayError } = await sb
    .from('ai_platform_usage_daily')
    .select('call_count, estimated_cost_usd')
    .eq('organization_id', organizationId)
    .eq('usage_date', today)
    .maybeSingle();
  if (todayError) throw new Error(todayError.message);

  const todayCallCount = Number(todayRow?.call_count ?? 0);
  const monthCallCount = await sumMonthCallCount(organizationId);
  const todayEstimatedCostUsd = Number(todayRow?.estimated_cost_usd ?? 0);
  const monthEstimatedCostUsd = await sumMonthCostUsd(organizationId);

  const dailyRemaining = Math.max(0, orgSettings.dailyCallLimit - todayCallCount);
  const monthlyRemaining = Math.max(0, orgSettings.monthlyCallLimit - monthCallCount);

  return {
    todayCallCount,
    monthCallCount,
    todayEstimatedCostUsd,
    monthEstimatedCostUsd,
    dailyCallLimit: orgSettings.dailyCallLimit,
    monthlyCallLimit: orgSettings.monthlyCallLimit,
    dailyRemaining,
    monthlyRemaining,
    planTier: orgSettings.planTier,
    quotaExceeded: dailyRemaining <= 0 || monthlyRemaining <= 0,
  };
}

/** Fail closed when platform/org disabled or org exceeded daily/monthly call caps. */
export async function assertOrgAiQuota(organizationId: string): Promise<void> {
  const global = await getAiPlatformGlobalSettings();
  if (!global.enabled) {
    throw new AiPlatformDisabledError();
  }

  const orgSettings = await getAiPlatformOrgSettings(organizationId);
  if (!orgSettings.enabled) {
    throw new AiPlatformDisabledError('AI is disabled for this organization');
  }

  if (!global.enforceQuotas) return;

  const summary = await getOrgAiUsageSummary(organizationId);
  if (summary.dailyRemaining <= 0) {
    throw new AiQuotaExceededError('Daily AI call limit reached for this organization');
  }
  if (summary.monthlyRemaining <= 0) {
    throw new AiQuotaExceededError('Monthly AI call limit reached for this organization');
  }
}

export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  const config = getModelConfig(input.feature);
  const inputTokens = Math.max(0, input.inputTokens ?? 0);
  const outputTokens = Math.max(0, input.outputTokens ?? 0);
  const estimatedCostUsd =
    input.estimatedCostUsd ?? estimateTokenCostUsd(config, inputTokens, outputTokens);

  const sb = db();
  const today = todayUtcDate();

  const { error: dailyError } = await sb.rpc('increment_ai_platform_usage_daily', {
    p_organization_id: input.organizationId,
    p_usage_date: today,
    p_call_count: 1,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_estimated_cost_usd: estimatedCostUsd,
  });

  if (dailyError) {
    // Fallback when RPC not yet applied (local dev before migrate)
    const { data: existing } = await sb
      .from('ai_platform_usage_daily')
      .select('id, call_count, input_tokens, output_tokens, estimated_cost_usd')
      .eq('organization_id', input.organizationId)
      .eq('usage_date', today)
      .maybeSingle();

    if (existing?.id) {
      await sb
        .from('ai_platform_usage_daily')
        .update({
          call_count: Number(existing.call_count ?? 0) + 1,
          input_tokens: Number(existing.input_tokens ?? 0) + inputTokens,
          output_tokens: Number(existing.output_tokens ?? 0) + outputTokens,
          estimated_cost_usd: Number(existing.estimated_cost_usd ?? 0) + estimatedCostUsd,
        })
        .eq('id', existing.id);
    } else {
      await sb.from('ai_platform_usage_daily').insert({
        organization_id: input.organizationId,
        usage_date: today,
        call_count: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: estimatedCostUsd,
      });
    }
  }

  const { error: eventError } = await sb.from('ai_platform_usage_events').insert({
    organization_id: input.organizationId,
    property_id: input.propertyId ?? null,
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    input_tokens: inputTokens || null,
    output_tokens: outputTokens || null,
    estimated_cost_usd: estimatedCostUsd,
  });
  if (eventError) {
    console.warn('[aiUsageService] usage event insert failed:', eventError.message);
  }
}

/** Optional org context — skips quota when orgId is null (e.g. platform verify probe). */
export async function assertOrgAiQuotaOptional(
  organizationId: string | null | undefined
): Promise<void> {
  if (!organizationId) return;
  await assertOrgAiQuota(organizationId);
}

export async function recordAiUsageOptional(
  organizationId: string | null | undefined,
  input: Omit<RecordAiUsageInput, 'organizationId'>
): Promise<void> {
  if (!organizationId) return;
  await recordAiUsage({ ...input, organizationId });
}

export function isAiQuotaError(error: unknown): error is AiQuotaExceededError {
  return error instanceof AiQuotaExceededError;
}

export function isAiPlatformDisabledError(error: unknown): error is AiPlatformDisabledError {
  return error instanceof AiPlatformDisabledError;
}
