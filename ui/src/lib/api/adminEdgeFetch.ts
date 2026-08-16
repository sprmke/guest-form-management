import { scopedAdminPath } from '@/features/dashboard/org/lib/adminApiScope';
import type { AdminAssetScope } from '@/features/dashboard/org/lib/adminAssetScope';
import { scopedAssetPath } from '@/features/dashboard/org/lib/adminAssetScope';

import { supabase } from '@/lib/supabase/client';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export async function adminEdgeFetch(
  path: string,
  init?: RequestInit,
  propertyId: string | null = null
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error('No admin session');
  const scopedPath =
    path.includes('property_id=') || path.includes('parking_id=')
      ? path
      : scopedAdminPath(path, propertyId);
  return fetch(`${FUNCTIONS_URL}${scopedPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function assetEdgeFetch(
  path: string,
  init: RequestInit | undefined,
  scope: AdminAssetScope
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error('No admin session');
  const hasScope = path.includes('property_id=') || path.includes('parking_id=');
  const scopedPath = hasScope ? path : scopedAssetPath(path, scope);
  return fetch(`${FUNCTIONS_URL}${scopedPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function parseAdminEdgeJson<T>(res: Response, fallbackError: string): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? fallbackError);
  }
  return json as T;
}

export async function adminEdgeFetchJson<T>(
  path: string,
  init: RequestInit | undefined,
  propertyId: string | null,
  fallbackError: string
): Promise<T> {
  const res = await adminEdgeFetch(path, init, propertyId);
  return parseAdminEdgeJson<T>(res, fallbackError);
}

export async function assetEdgeFetchJson<T>(
  path: string,
  init: RequestInit | undefined,
  scope: AdminAssetScope,
  fallbackError: string
): Promise<T> {
  const res = await assetEdgeFetch(path, init, scope);
  return parseAdminEdgeJson<T>(res, fallbackError);
}
