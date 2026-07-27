/**
 * Admin: returns whether Gmail API OAuth is stored (no secrets in response).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getGmailAccessTokenUnified,
  supabaseServiceRole,
} from '../_shared/gmailMailOAuthAccess.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  try {
    const { property } = await resolveScopedPropertyAccess(req, 'settings:view');
    const propertyId = property.id;
    const sb = supabaseServiceRole();
    const { data, error } = await sb
      .from('gmail_mail_integration')
      .select('google_account_email, connected_at, refresh_token_encrypted')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const connected = !!data?.refresh_token_encrypted;
    let needsReconnect = false;

    if (connected) {
      try {
        await getGmailAccessTokenUnified(propertyId);
      } catch (e: unknown) {
        const err = e as Error & { needsReAuth?: boolean };
        if (
          err.needsReAuth === true ||
          err.message?.includes('invalid_grant') ||
          err.message?.includes('Reconnect Gmail')
        ) {
          needsReconnect = true;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connected,
        needsReconnect,
        googleAccountEmail: connected ? (data?.google_account_email ?? null) : null,
        connectedAt: connected ? (data?.connected_at ?? null) : null,
      }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
