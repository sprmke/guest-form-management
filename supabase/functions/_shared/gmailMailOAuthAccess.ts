/**
 * Gmail API access tokens: Web OAuth client (platform env) + per-property refresh token (DB).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { decryptGmailRefreshToken } from './gmailMailOAuthCrypto.ts';

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/** Scopes for Settings → Connect Google (Gmail listener only). Re-consent required for narrower scope. */
export const GOOGLE_CONNECT_OAUTH_SCOPES = [GMAIL_READONLY_SCOPE].join(' ');

export type WebClientCredentials = { clientId: string; clientSecret: string };

/** JSON from Google Cloud "Web application" OAuth client (same shape as legacy installed/web blobs). */
function parseGmailApiWebClientJson(raw: string): WebClientCredentials {
  const clientJson = JSON.parse(raw);
  const inner = clientJson.web ?? clientJson.installed;
  if (!inner?.client_id || !inner?.client_secret) {
    throw new Error('client_id or client_secret missing in GMAIL_API_WEB_CLIENT_JSON');
  }
  return { clientId: inner.client_id as string, clientSecret: inner.client_secret as string };
}

export function getGmailApiWebClientFromEnv(): WebClientCredentials {
  const raw = Deno.env.get('GMAIL_API_WEB_CLIENT_JSON');
  if (!raw) {
    throw new Error(
      'Missing GMAIL_API_WEB_CLIENT_JSON — download OAuth 2.0 Web client JSON from Google Cloud Console'
    );
  }
  try {
    return parseGmailApiWebClientJson(raw);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse GMAIL_API_WEB_CLIENT_JSON: ${msg}`);
  }
}

export function supabaseServiceRole() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function exchangeRefreshForAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (body.includes('invalid_grant')) {
      const err = new Error(
        'Google OAuth failed: invalid_grant. Refresh token is expired or revoked — reconnect Google in Admin → Settings.'
      );
      (err as Error & { needsReAuth?: boolean }).needsReAuth = true;
      throw err;
    }
    throw new Error(`Gmail token exchange failed (${resp.status}): ${body}`);
  }

  const json = (await resp.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Gmail token exchange returned no access_token');
  return json.access_token;
}

export async function exchangeCodeForTokens(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ refresh_token?: string; access_token: string }> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OAuth code exchange failed (${resp.status}): ${body}`);
  }
  return (await resp.json()) as { refresh_token?: string; access_token: string };
}

import { publicApiBaseUrl } from './publicApiBaseUrl.ts';

/** Canonical redirect_uri registered with Google for this deployment. */
export function gmailMailOAuthRedirectUri(): string {
  return `${publicApiBaseUrl()}/functions/v1/google-mail-oauth-callback`;
}

async function loadRefreshTokenFromDb(propertyId: string): Promise<string | null> {
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('gmail_mail_integration')
    .select('refresh_token_encrypted')
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) {
    console.warn('[gmail-mail-oauth] DB read failed:', error.message);
    return null;
  }
  const enc = data?.refresh_token_encrypted as string | null | undefined;
  if (!enc) return null;
  try {
    return await decryptGmailRefreshToken(enc);
  } catch (e) {
    console.error('[gmail-mail-oauth] Decrypt failed:', e);
    throw e;
  }
}

/** Returns a short-lived Gmail access token for a connected property inbox. */
export async function getGmailAccessTokenUnified(
  propertyId: string
): Promise<{ accessToken: string }> {
  if (!propertyId.trim()) {
    throw new Error('propertyId required for Gmail access');
  }

  const { clientId, clientSecret } = getGmailApiWebClientFromEnv();
  const fromDb = await loadRefreshTokenFromDb(propertyId);
  if (!fromDb) {
    throw new Error(
      'Gmail is not connected for this property — connect from Admin → Settings → Integrations'
    );
  }

  const accessToken = await exchangeRefreshForAccessToken(clientId, clientSecret, fromDb);
  return { accessToken };
}

export async function fetchGmailProfileEmail(accessToken: string): Promise<string> {
  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gmail profile failed (${resp.status}): ${t}`);
  }
  const j = (await resp.json()) as { emailAddress?: string };
  if (!j.emailAddress) throw new Error('Gmail profile missing emailAddress');
  return j.emailAddress;
}
