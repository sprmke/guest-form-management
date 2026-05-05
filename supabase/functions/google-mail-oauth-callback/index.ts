/**
 * Public GET: Google redirects here with ?code=&state=. Exchanges code, stores encrypted refresh token.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  exchangeCodeForTokens,
  fetchGmailProfileEmail,
  getGmailApiWebClientFromEnv,
  gmailMailOAuthRedirectUri,
  supabaseServiceRole,
} from '../_shared/gmailMailOAuthAccess.ts';
import { encryptGmailRefreshToken } from '../_shared/gmailMailOAuthCrypto.ts';
import {
  buildErrorRedirect,
  buildSuccessRedirect,
  isReturnOriginAllowed,
  parseAllowedReturnOrigins,
} from '../_shared/gmailMailOAuthReturnUrl.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(req) });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const sb = supabaseServiceRole();

  async function loadState(): Promise<{
    return_origin: string;
    return_path: string;
  } | null> {
    if (!state) return null;
    const { data, error } = await sb
      .from('gmail_mail_oauth_state')
      .select('return_origin, return_path, expires_at')
      .eq('state', state)
      .maybeSingle();
    if (error || !data) return null;
    const exp = new Date(data.expires_at as string).getTime();
    if (Number.isNaN(exp) || Date.now() > exp) return null;
    if (!isReturnOriginAllowed(data.return_origin as string)) return null;
    return {
      return_origin: data.return_origin as string,
      return_path: (data.return_path as string) || '/settings',
    };
  }

  const st = await loadState();

  const fallbackOrigin = () => parseAllowedReturnOrigins()[0] ?? 'http://127.0.0.1:5173';

  if (oauthError) {
    const dest = st
      ? buildErrorRedirect(st.return_origin, st.return_path, oauthError)
      : `${fallbackOrigin()}/settings?gmail_error=${encodeURIComponent(oauthError)}`;
    if (state) await sb.from('gmail_mail_oauth_state').delete().eq('state', state);
    return Response.redirect(dest, 302);
  }

  if (!code || !state || !st) {
    const dest = st
      ? buildErrorRedirect(st.return_origin, st.return_path, 'invalid_state')
      : `${fallbackOrigin()}/settings?gmail_error=invalid_state`;
    return Response.redirect(dest, 302);
  }

  try {
    const { clientId, clientSecret } = getGmailApiWebClientFromEnv();
    const redirectUri = gmailMailOAuthRedirectUri();
    const tokens = await exchangeCodeForTokens({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });

    if (!tokens.refresh_token) {
      const dest = buildErrorRedirect(
        st.return_origin,
        st.return_path,
        'missing_refresh_token',
      );
      await sb.from('gmail_mail_oauth_state').delete().eq('state', state);
      return Response.redirect(dest, 302);
    }

    const encrypted = await encryptGmailRefreshToken(tokens.refresh_token);
    const profileEmail = await fetchGmailProfileEmail(tokens.access_token);

    const { error: upErr } = await sb.from('gmail_mail_integration').upsert(
      {
        id: 'default',
        refresh_token_encrypted: encrypted,
        google_account_email: profileEmail,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (upErr) {
      console.error('[google-mail-oauth-callback] upsert:', upErr);
      const dest = buildErrorRedirect(st.return_origin, st.return_path, 'save_failed');
      await sb.from('gmail_mail_oauth_state').delete().eq('state', state);
      return Response.redirect(dest, 302);
    }

    await sb.from('gmail_listener_state').upsert(
      {
        id: 'default',
        email_address: profileEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    await sb.from('gmail_mail_oauth_state').delete().eq('state', state);

    return Response.redirect(buildSuccessRedirect(st.return_origin, st.return_path), 302);
  } catch (e) {
    console.error('[google-mail-oauth-callback]', e);
    const dest = buildErrorRedirect(st.return_origin, st.return_path, 'token_exchange_failed');
    await sb.from('gmail_mail_oauth_state').delete().eq('state', state);
    return Response.redirect(dest, 302);
  }
});
