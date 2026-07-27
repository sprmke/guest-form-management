/**
 * Upsert Gmail/Google integration row for a property.
 * Uses PK `id` (not property_id) — PostgREST cannot target the partial unique index on property_id.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export async function upsertPropertyGmailIntegration(
  sb: SupabaseClient,
  propertyId: string,
  fields: {
    refresh_token_encrypted: string;
    google_account_email: string;
    connected_at: string;
  }
): Promise<{ error: { message: string; code?: string } | null }> {
  const { data: existing } = await sb
    .from('gmail_mail_integration')
    .select('id')
    .eq('property_id', propertyId)
    .maybeSingle();

  // Pre-per-property migration row: id='default', property_id set — remove before insert.
  if (existing?.id === 'default') {
    await sb.from('gmail_mail_integration').delete().eq('id', 'default');
  }

  const { error } = await sb.from('gmail_mail_integration').upsert(
    {
      id: propertyId,
      property_id: propertyId,
      refresh_token_encrypted: fields.refresh_token_encrypted,
      google_account_email: fields.google_account_email,
      connected_at: fields.connected_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  return { error };
}
