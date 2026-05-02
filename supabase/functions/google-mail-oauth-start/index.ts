/**
 * Admin-only: returns a Google OAuth URL to connect Gmail (gmail.readonly) for gmail-listener.
 *
 * Env: GMAIL_API_WEB_CLIENT_JSON, GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS (optional)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import {
  GMAIL_READONLY_SCOPE,
  getGmailApiWebClientFromEnv,
  gmailMailOAuthRedirectUri,
  supabaseServiceRole,
} from '../_shared/gmailMailOAuthAccess.ts';
import {
  isReturnOriginAllowed,
  normalizeReturnOrigin,
  sanitizeReturnPath,
} from '../_shared/gmailMailOAuthReturnUrl.ts';

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  try {
    await verifyAdminJwt(req);

    let returnPath = '/bookings';
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.returnPath === 'string') {
        returnPath = sanitizeReturnPath(body.returnPath);
      }
    } catch {
      /* use default */
    }

    const originHeader = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
    let returnOrigin = '';
    if (originHeader.startsWith('http://') || originHeader.startsWith('https://')) {
      try {
        const u = new URL(originHeader);
        returnOrigin = `${u.protocol}//${u.host}`;
      } catch {
        returnOrigin = '';
      }
    }

    if (!returnOrigin || !isReturnOriginAllowed(returnOrigin)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing or disallowed Origin. Ensure the SPA Origin is listed in GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS.',
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    returnOrigin = normalizeReturnOrigin(returnOrigin);

    const { clientId } = getGmailApiWebClientFromEnv();
    const redirectUri = gmailMailOAuthRedirectUri();
    const state = randomState();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const sb = supabaseServiceRole();
    await sb.from('gmail_mail_oauth_state').delete().lt('expires_at', new Date().toISOString());

    const { error: insErr } = await sb.from('gmail_mail_oauth_state').insert({
      state,
      expires_at: expiresAt,
      return_origin: returnOrigin,
      return_path: returnPath,
    });
    if (insErr) {
      console.error('[google-mail-oauth-start] state insert:', insErr);
      return new Response(JSON.stringify({ success: false, error: 'Failed to start OAuth' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_READONLY_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(JSON.stringify({ success: true, url }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[google-mail-oauth-start]', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
