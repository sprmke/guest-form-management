/**
 * When a new property is created in an org that already has Google connected elsewhere,
 * copy the encrypted Gmail refresh token.
 */

import { supabaseServiceRole } from './gmailMailOAuthAccess.ts';
import { ensurePropertySettings } from './propertySettingsSeed.ts';

export async function seedGoogleIntegrationForNewProperty(
  orgId: string,
  newPropertyId: string,
  _propertyName: string
): Promise<{ copied: boolean }> {
  const sb = supabaseServiceRole();

  const { data: orgProps, error: propsErr } = await sb
    .from('properties')
    .select('id')
    .eq('organization_id', orgId);

  if (propsErr) {
    console.error('[propertyGoogleIntegrationSeed] properties:', propsErr.message);
    return { copied: false };
  }

  const siblingIds = (orgProps ?? [])
    .map((row) => row.id as string)
    .filter((id) => id !== newPropertyId);

  if (siblingIds.length === 0) {
    return { copied: false };
  }

  const { data: source, error: srcErr } = await sb
    .from('gmail_mail_integration')
    .select('property_id, refresh_token_encrypted, google_account_email, connected_at')
    .in('property_id', siblingIds)
    .not('refresh_token_encrypted', 'is', null)
    .limit(1)
    .maybeSingle();

  if (srcErr || !source?.refresh_token_encrypted) {
    return { copied: false };
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
    return { copied: false };
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
  } catch (e) {
    console.error('[propertyGoogleIntegrationSeed] ensurePropertySettings:', e);
  }

  return { copied: true };
}
