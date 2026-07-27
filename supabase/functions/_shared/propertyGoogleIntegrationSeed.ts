/**
 * When a new property is created in an org that already has Google connected elsewhere,
 * copy the encrypted refresh token and auto-provision calendar + spreadsheet (Phase 2g.4).
 */

import { getGmailAccessTokenUnified, supabaseServiceRole } from './gmailMailOAuthAccess.ts';
import {
  persistProvisionedGoogleIds,
  provisionPropertyGoogleResources,
} from './propertyGoogleOAuthProvision.ts';
import { ensurePropertySettings } from './propertySettingsSeed.ts';

export async function seedGoogleIntegrationForNewProperty(
  orgId: string,
  newPropertyId: string,
  propertyName: string
): Promise<{ copied: boolean; provisioned: boolean }> {
  const sb = supabaseServiceRole();

  const { data: orgProps, error: propsErr } = await sb
    .from('properties')
    .select('id')
    .eq('organization_id', orgId);

  if (propsErr) {
    console.error('[propertyGoogleIntegrationSeed] properties:', propsErr.message);
    return { copied: false, provisioned: false };
  }

  const siblingIds = (orgProps ?? [])
    .map((row) => row.id as string)
    .filter((id) => id !== newPropertyId);

  if (siblingIds.length === 0) {
    return { copied: false, provisioned: false };
  }

  const { data: source, error: srcErr } = await sb
    .from('gmail_mail_integration')
    .select('property_id, refresh_token_encrypted, google_account_email, connected_at')
    .in('property_id', siblingIds)
    .not('refresh_token_encrypted', 'is', null)
    .limit(1)
    .maybeSingle();

  if (srcErr || !source?.refresh_token_encrypted) {
    return { copied: false, provisioned: false };
  }

  const connectedAt = (source.connected_at as string | null) ?? new Date().toISOString();
  const profileEmail = String(source.google_account_email ?? '').trim();

  const { error: upErr } = await sb.from('gmail_mail_integration').upsert(
    {
      id: newPropertyId,
      property_id: newPropertyId,
      refresh_token_encrypted: source.refresh_token_encrypted as string,
      google_account_email: profileEmail || null,
      connected_at: connectedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upErr) {
    console.error('[propertyGoogleIntegrationSeed] gmail upsert:', upErr.message);
    return { copied: false, provisioned: false };
  }

  if (profileEmail) {
    await sb.from('gmail_listener_state').upsert(
      {
        id: newPropertyId,
        property_id: newPropertyId,
        email_address: profileEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  try {
    await ensurePropertySettings(newPropertyId);

    const { data: appRow } = await sb
      .from('app_settings')
      .select('google_calendar_id, google_spreadsheet_id')
      .eq('property_id', newPropertyId)
      .maybeSingle();

    const calendarId = String(appRow?.google_calendar_id ?? '').trim();
    const spreadsheetId = String(appRow?.google_spreadsheet_id ?? '').trim();
    const createCalendar = !calendarId;
    const createSpreadsheet = !spreadsheetId;

    if (!createCalendar && !createSpreadsheet) {
      return { copied: true, provisioned: false };
    }

    const { accessToken } = await getGmailAccessTokenUnified(newPropertyId);
    const provisioned = await provisionPropertyGoogleResources(accessToken, propertyName, {
      createCalendar,
      createSpreadsheet,
    });
    await persistProvisionedGoogleIds(newPropertyId, provisioned);
    return { copied: true, provisioned: true };
  } catch (e) {
    console.error('[propertyGoogleIntegrationSeed] provision:', e);
    return { copied: true, provisioned: false };
  }
}
