import { scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { scopedParkingFunctionsBaseUrl } from '@/features/dashboard/org/lib/adminParkingScope';
import { throwIfUpgradeHookFromJson } from '@/features/dashboard/org/lib/aiQuotaToast';

import { supabase } from '@/lib/supabase/client';

export async function teamAuthHeaders(): Promise<HeadersInit> {
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

export async function teamGet<T>(path: string, propertyId: string): Promise<T> {
  const headers = await teamAuthHeaders();
  const res = await fetch(scopedFunctionsUrl(path, propertyId), { headers });
  const json = (await res.json().catch(() => ({}))) as ApiJson<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  if (json.data === undefined) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}

export async function teamMutate<T>(
  path: string,
  propertyId: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const headers = await teamAuthHeaders();
  const payload = { propertyId, ...body };
  const res = await fetch(scopedFunctionsUrl(path, propertyId), {
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

export async function teamGetParking<T>(path: string, parkingId: string): Promise<T> {
  const headers = await teamAuthHeaders();
  const res = await fetch(scopedParkingFunctionsBaseUrl(path, parkingId), { headers });
  const json = (await res.json().catch(() => ({}))) as ApiJson<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  if (json.data === undefined) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}

export async function teamMutateParking<T>(
  path: string,
  parkingId: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const headers = await teamAuthHeaders();
  const payload = { parkingId, ...body };
  const res = await fetch(scopedParkingFunctionsBaseUrl(path, parkingId), {
    method,
    headers,
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as ApiJson<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  return (json.data ?? {}) as T;
}
