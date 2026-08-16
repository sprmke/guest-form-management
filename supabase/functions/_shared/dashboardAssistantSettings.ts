/**
 * Kill-switch config + quota metering for the AI dashboard assistant.
 * Independent of the ai_platform_* tables / aiUsageService.ts (Phase A) — own tables, own soft-cap quota.
 * Docs: docs/workflow/planned/ai-dashboard-assistant.md §1 step 2-3, §4, §6.
 */

import { createServiceClient } from './orgAuth.ts';

export type DashboardAssistantGlobalSettings = {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

export type DashboardAssistantOrgSettings = {
  organizationId: string;
  enabled: boolean;
  disabledPropertyIds: string[];
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  dailyWriteActionLimit: number;
  updatedBy: string | null;
  updatedAt: string;
};

export async function getDashboardAssistantGlobalSettings(): Promise<DashboardAssistantGlobalSettings> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('ai_dashboard_assistant_global_settings')
    .select('enabled, updated_by, updated_at')
    .eq('id', true)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load dashboard assistant global settings: ${error.message}`);
  }
  return {
    enabled: Boolean(data?.enabled),
    updatedBy: (data?.updated_by as string | null) ?? null,
    updatedAt: (data?.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function setDashboardAssistantGlobalSettings(input: {
  enabled?: boolean;
  updatedBy: string;
}): Promise<DashboardAssistantGlobalSettings> {
  const sb = createServiceClient();
  const patch: Record<string, unknown> = {
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (input.enabled !== undefined) patch.enabled = input.enabled;

  const { data, error } = await sb
    .from('ai_dashboard_assistant_global_settings')
    .update(patch)
    .eq('id', true)
    .select('enabled, updated_by, updated_at')
    .single();
  if (error) {
    throw new Error(`Failed to update dashboard assistant global settings: ${error.message}`);
  }
  return {
    enabled: Boolean(data.enabled),
    updatedBy: (data.updated_by as string | null) ?? null,
    updatedAt: data.updated_at as string,
  };
}

function mapOrgSettingsRow(
  organizationId: string,
  row: Record<string, unknown> | null
): DashboardAssistantOrgSettings {
  return {
    organizationId,
    enabled: Boolean(row?.enabled),
    disabledPropertyIds: ((row?.disabled_property_ids as string[] | null) ?? []) as string[],
    dailyMessageLimit: Number(row?.daily_message_limit ?? 50),
    monthlyMessageLimit: Number(row?.monthly_message_limit ?? 1000),
    dailyWriteActionLimit: Number(row?.daily_write_action_limit ?? 20),
    updatedBy: (row?.updated_by as string | null) ?? null,
    updatedAt: (row?.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function getDashboardAssistantOrgSettings(
  organizationId: string
): Promise<DashboardAssistantOrgSettings> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('ai_dashboard_assistant_org_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load dashboard assistant org settings: ${error.message}`);
  }
  return mapOrgSettingsRow(organizationId, data);
}

export async function upsertDashboardAssistantOrgSettings(input: {
  organizationId: string;
  enabled?: boolean;
  disabledPropertyIds?: string[];
  dailyMessageLimit?: number;
  monthlyMessageLimit?: number;
  dailyWriteActionLimit?: number;
  updatedBy: string;
}): Promise<DashboardAssistantOrgSettings> {
  const sb = createServiceClient();
  const patch: Record<string, unknown> = {
    organization_id: input.organizationId,
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  if (input.disabledPropertyIds !== undefined)
    patch.disabled_property_ids = input.disabledPropertyIds;
  if (input.dailyMessageLimit !== undefined) patch.daily_message_limit = input.dailyMessageLimit;
  if (input.monthlyMessageLimit !== undefined)
    patch.monthly_message_limit = input.monthlyMessageLimit;
  if (input.dailyWriteActionLimit !== undefined)
    patch.daily_write_action_limit = input.dailyWriteActionLimit;

  const { data, error } = await sb
    .from('ai_dashboard_assistant_org_settings')
    .upsert(patch, { onConflict: 'organization_id' })
    .select('*')
    .single();
  if (error) {
    throw new Error(`Failed to update dashboard assistant org settings: ${error.message}`);
  }
  return mapOrgSettingsRow(input.organizationId, data);
}

// ─── Quota (soft cap, no billing wiring — see plan's explicit non-goals) ────

export type DashboardAssistantQuotaCheck = {
  allowed: boolean;
  reason: 'ok' | 'daily_limit' | 'monthly_limit';
  messageCountToday: number;
  dailyMessageLimit: number;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  return `${todayIso().slice(0, 7)}-01`;
}

export async function checkDashboardAssistantQuota(
  organizationId: string,
  orgSettings: DashboardAssistantOrgSettings
): Promise<DashboardAssistantQuotaCheck> {
  const sb = createServiceClient();
  const today = todayIso();

  const { data: todayRow } = await sb
    .from('ai_dashboard_assistant_usage_daily')
    .select('message_count')
    .eq('organization_id', organizationId)
    .eq('usage_date', today)
    .maybeSingle();
  const messageCountToday = Number(todayRow?.message_count ?? 0);

  if (messageCountToday >= orgSettings.dailyMessageLimit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      messageCountToday,
      dailyMessageLimit: orgSettings.dailyMessageLimit,
    };
  }

  const { data: monthRows } = await sb
    .from('ai_dashboard_assistant_usage_daily')
    .select('message_count')
    .eq('organization_id', organizationId)
    .gte('usage_date', monthStartIso())
    .lte('usage_date', today);
  const messageCountMonth = (monthRows ?? []).reduce(
    (sum, r) => sum + Number(r.message_count ?? 0),
    0
  );

  if (messageCountMonth >= orgSettings.monthlyMessageLimit) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      messageCountToday,
      dailyMessageLimit: orgSettings.dailyMessageLimit,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    messageCountToday,
    dailyMessageLimit: orgSettings.dailyMessageLimit,
  };
}

export async function incrementDashboardAssistantUsage(
  organizationId: string,
  input: { message?: boolean; writeAction?: boolean }
): Promise<void> {
  const sb = createServiceClient();
  const today = todayIso();

  const { data: existing } = await sb
    .from('ai_dashboard_assistant_usage_daily')
    .select('message_count, write_action_count')
    .eq('organization_id', organizationId)
    .eq('usage_date', today)
    .maybeSingle();

  const messageCount = Number(existing?.message_count ?? 0) + (input.message ? 1 : 0);
  const writeActionCount = Number(existing?.write_action_count ?? 0) + (input.writeAction ? 1 : 0);

  const { error } = await sb.from('ai_dashboard_assistant_usage_daily').upsert(
    {
      organization_id: organizationId,
      usage_date: today,
      message_count: messageCount,
      write_action_count: writeActionCount,
    },
    { onConflict: 'organization_id,usage_date' }
  );
  if (error) {
    console.error('[dashboardAssistantSettings] usage increment failed:', error.message);
  }
}

/** True only when both kill-switch layers are on and this property (if any) isn't opted out. */
export function isDashboardAssistantAccessible(
  global: DashboardAssistantGlobalSettings,
  org: DashboardAssistantOrgSettings,
  propertyId?: string | null
): boolean {
  if (!global.enabled) return false;
  if (!org.enabled) return false;
  if (propertyId && org.disabledPropertyIds.includes(propertyId)) return false;
  return true;
}
