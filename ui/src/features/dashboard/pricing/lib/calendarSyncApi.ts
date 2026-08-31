import { scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

import { supabase } from '@/lib/supabase/client';

export type CalendarFeedProvider = 'airbnb' | 'booking_com' | 'vrbo' | 'other';

export const CALENDAR_PROVIDER_LABELS: Record<CalendarFeedProvider, string> = {
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  vrbo: 'VRBO',
  other: 'Other (iCal URL)',
};

export type CalendarSyncFeed = {
  id: string;
  provider: CalendarFeedProvider;
  label: string | null;
  isActive: boolean;
  createBookings: boolean;
  maskedUrl: string;
  hasUrl: boolean;
  health: 'ok' | 'warning' | 'error';
  lastAttemptedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  createdAt: string;
};

export type CalendarSyncEvent = {
  id: number;
  feed_id: string;
  action: string;
  external_uid: string | null;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type CalendarSyncExport = {
  enabled: boolean;
  rotatedAt: string | null;
  lastServedAt: string | null;
  urls: { all: string; airbnb: string; booking_com: string; vrbo: string };
};

export type CalendarSyncSettings = {
  feeds: CalendarSyncFeed[];
  export: CalendarSyncExport;
  recentEvents: CalendarSyncEvent[];
};

export type FeedSyncResult = {
  feedId: string;
  status: string;
  ok: boolean;
  blocksCreated: number;
  blocksUpdated: number;
  blocksRemoved: number;
  conflicts: number;
  error?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function url(propertyId: string): string {
  return scopedFunctionsUrl('/calendar-sync-settings', propertyId);
}

export type CalendarSyncClientError = Error & {
  upgradeRequired?: boolean;
  feature?: PlanFeatureKey;
};

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (json?.upgradeHook || res.status === 429) {
    const err = new Error(json?.error ?? 'Upgrade required') as CalendarSyncClientError;
    err.upgradeRequired = true;
    if (typeof json?.feature === 'string') err.feature = json.feature as PlanFeatureKey;
    throw err;
  }
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error ?? json?.message ?? 'Request failed');
  }
  return (json.data ?? json) as T;
}

export async function fetchCalendarSyncSettings(propertyId: string): Promise<CalendarSyncSettings> {
  const res = await fetch(url(propertyId), { headers: await authHeaders() });
  return parse<CalendarSyncSettings>(res);
}

async function patch<T>(propertyId: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url(propertyId), {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

export function addCalendarFeed(
  propertyId: string,
  input: { provider: CalendarFeedProvider; label?: string; icsUrl: string }
) {
  return patch<{ feed: unknown; initialSync?: FeedSyncResult | null }>(propertyId, {
    action: 'addFeed',
    ...input,
    icsUrl: input.icsUrl.trim(),
  });
}

export function updateCalendarFeed(
  propertyId: string,
  input: { feedId: string; label?: string; icsUrl?: string; isActive?: boolean }
) {
  return patch<{ feed: unknown }>(propertyId, { action: 'updateFeed', ...input });
}

export function removeCalendarFeed(propertyId: string, feedId: string, deleteData: boolean) {
  return patch<{ removed: string }>(propertyId, { action: 'removeFeed', feedId, deleteData });
}

export function rotateExportToken(propertyId: string) {
  return patch<{ urls: CalendarSyncExport['urls'] }>(propertyId, { action: 'rotateExportToken' });
}

export function setExportEnabled(propertyId: string, enabled: boolean) {
  return patch<{ enabled: boolean }>(propertyId, { action: 'setExportEnabled', enabled });
}

export function syncFeedNow(propertyId: string, feedId: string) {
  return patch<{ result: FeedSyncResult }>(propertyId, { action: 'syncNow', feedId });
}

export const CALENDAR_SYNC_QUERY_KEY = 'calendar-sync';
