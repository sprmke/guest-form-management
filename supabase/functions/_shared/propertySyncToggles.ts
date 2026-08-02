/**
 * Per-property Calendar / Sheets sync master switches (`app_settings.sync_*`).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export type PropertySyncToggles = { syncCalendar: boolean; syncSheets: boolean };

export const DEFAULT_PROPERTY_SYNC_TOGGLES: PropertySyncToggles = {
  syncCalendar: true,
  syncSheets: true,
};

type SyncToggleRow = {
  sync_calendar?: unknown;
  sync_sheets?: unknown;
};

export function mergePropertySyncToggles(raw: unknown): PropertySyncToggles {
  const merged = { ...DEFAULT_PROPERTY_SYNC_TOGGLES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return merged;
  }
  const record = raw as SyncToggleRow;
  if (typeof record.sync_calendar === 'boolean') {
    merged.syncCalendar = record.sync_calendar;
  }
  if (typeof record.sync_sheets === 'boolean') {
    merged.syncSheets = record.sync_sheets;
  }
  return merged;
}

async function loadPropertySyncTogglesRaw(propertyId: string): Promise<unknown> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const { data, error } = await supabase
    .from('app_settings')
    .select('sync_calendar, sync_sheets')
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) {
    console.warn('[propertySyncToggles] load failed:', error.message);
    return null;
  }

  return data ?? null;
}

export async function resolvePropertySyncToggles(propertyId: string): Promise<PropertySyncToggles> {
  const raw = await loadPropertySyncTogglesRaw(propertyId);
  return mergePropertySyncToggles(raw);
}
