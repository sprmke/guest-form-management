/**
 * Per-property Google Calendar / Sheets IDs (DB only).
 * API auth: propertyGoogleApiAuth.ts (user OAuth preferred; service account legacy fallback).
 */

import { createServiceClient } from './orgAuth.ts';
import { trimOrEmpty } from './stringUtils.ts';

async function loadGoogleIdFromDb(
  propertyId: string | null | undefined,
  column: 'google_calendar_id' | 'google_spreadsheet_id'
): Promise<string> {
  if (!propertyId?.trim()) return '';
  const { data } = await createServiceClient()
    .from('app_settings')
    .select(column)
    .eq('property_id', propertyId)
    .maybeSingle();
  return trimOrEmpty(data?.[column] as string | null);
}

export async function resolveGoogleCalendarId(propertyId?: string | null): Promise<string> {
  return loadGoogleIdFromDb(propertyId, 'google_calendar_id');
}

export async function resolveGoogleSpreadsheetId(propertyId?: string | null): Promise<string> {
  return loadGoogleIdFromDb(propertyId, 'google_spreadsheet_id');
}

export async function resolveGoogleServiceAccount(): Promise<Record<string, unknown> | null> {
  const raw = trimOrEmpty(Deno.env.get('GOOGLE_SERVICE_ACCOUNT'));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error('[propertyGoogleConfig] invalid GOOGLE_SERVICE_ACCOUNT JSON');
    return null;
  }
}
