import { scopedOrgFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { throwIfUpgradeHookFromJson } from '@/features/dashboard/org/lib/aiQuotaToast';

import { supabase } from '@/lib/supabase/client';

export async function orgTeamAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not signed in');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

type ApiJson<T> = {
  success?: boolean;
  error?: string;
  data?: T;
};

export async function orgTeamGet<T>(
  path: string,
  orgSlug: string | null,
  orgId: string | null
): Promise<T> {
  const headers = await orgTeamAuthHeaders();
  const res = await fetch(scopedOrgFunctionsUrl(path, orgSlug, orgId), { headers });
  const json = (await res.json().catch(() => ({}))) as ApiJson<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  if (json.data === undefined) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}

export async function orgTeamMutate<T>(
  path: string,
  orgSlug: string | null,
  orgId: string | null,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const headers = await orgTeamAuthHeaders();
  const payload = { orgId, ...body };
  const res = await fetch(scopedOrgFunctionsUrl(path, orgSlug, orgId), {
    method,
    headers,
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as ApiJson<T> & {
    upgradeHook?: boolean;
    feature?: string;
  };
  if (json.upgradeHook || res.status === 429) {
    throwIfUpgradeHookFromJson(json, res);
  }
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  return (json.data ?? {}) as T;
}
