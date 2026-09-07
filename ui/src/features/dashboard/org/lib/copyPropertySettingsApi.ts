import type { CopyPropertySettingsGroupId } from '@/features/dashboard/org/lib/copyPropertySettingsGroups';
import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export type CopyPropertySettingsOptions = {
  copyContact?: boolean;
  copyEmailRecipients?: boolean;
  copyTelegramCredentials?: boolean;
  skipAlreadyCustomized?: boolean;
};

export type CopyPropertySettingsRequest = {
  sourcePropertyId: string;
  targetPropertyIds: string[];
  groups: CopyPropertySettingsGroupId[];
  options?: CopyPropertySettingsOptions;
  dryRun?: boolean;
};

export type CopyPropertySettingsSkipReason =
  'permission' | 'plan' | 'opt_in' | 'not_implemented' | 'empty' | 'already_customized';

export type CopyPropertySettingsSkip = {
  group: CopyPropertySettingsGroupId | string;
  reason: CopyPropertySettingsSkipReason | string;
  detail?: string;
};

export type CopyPropertySettingsFailure = {
  group: CopyPropertySettingsGroupId | string;
  error: string;
};

export type CopyPropertySettingsTargetResult = {
  targetPropertyId: string;
  applied: string[];
  skipped: CopyPropertySettingsSkip[];
  failed: CopyPropertySettingsFailure[];
  alreadyCustomized: string[];
};

export type CopyPropertySettingsResponse = {
  dryRun: boolean;
  results: CopyPropertySettingsTargetResult[];
  logId?: string;
};

export type PropertySettingsCopyLogEntry = {
  id: string;
  organization_id: string;
  source_property_id: string;
  actor_user_id: string | null;
  groups: string[];
  target_property_ids: string[];
  results: CopyPropertySettingsTargetResult[] | unknown;
  created_at: string;
};

export type ListPropertySettingsCopyLogsResponse = {
  logs: PropertySettingsCopyLogEntry[];
};

export function copyPropertySettings(
  body: CopyPropertySettingsRequest
): Promise<CopyPropertySettingsResponse> {
  return callEdgeFunction<CopyPropertySettingsResponse>('copy-property-settings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPropertySettingsCopyLogs(args: {
  orgSlug: string;
  limit?: number;
}): Promise<ListPropertySettingsCopyLogsResponse> {
  return callEdgeFunction<ListPropertySettingsCopyLogsResponse>('copy-property-settings', {
    method: 'POST',
    body: JSON.stringify({
      action: 'listLogs',
      orgSlug: args.orgSlug,
      limit: args.limit ?? 20,
    }),
  });
}
