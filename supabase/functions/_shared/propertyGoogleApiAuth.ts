/**
 * Google Calendar / Sheets API auth per property: user OAuth (preferred) or service account (legacy).
 */

import { getGmailAccessTokenUnified } from './gmailMailOAuthAccess.ts';
import {
  resolveGoogleCalendarId,
  resolveGoogleServiceAccount,
  resolveGoogleSpreadsheetId,
} from './propertyGoogleConfig.ts';

export type GoogleApiAuthSource = 'user_oauth' | 'service_account';

export type GoogleCalendarAuth = {
  calendarId: string;
  accessToken: string;
  authSource: GoogleApiAuthSource;
};

export type GoogleSheetsAuth = {
  spreadsheetId: string;
  accessToken: string;
  authSource: GoogleApiAuthSource;
};

async function getServiceAccountAccessToken(
  serviceAccount: Record<string, unknown>,
  scope: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: 'RS256', typ: 'JWT' };
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(jwtHeader));
  const encodedClaimSet = btoa(JSON.stringify(jwtClaimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const privateKey = String(serviceAccount.private_key ?? '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----\n/, '')
    .replace(/\n-----END PRIVATE KEY-----/, '')
    .trim();

  const binaryDer = Uint8Array.from(atob(privateKey), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('Service account token exchange returned no access_token');
  }
  return tokenData.access_token;
}

async function tryUserOAuthAccessToken(propertyId: string): Promise<string | null> {
  if (!propertyId.trim()) return null;
  try {
    const { accessToken } = await getGmailAccessTokenUnified(propertyId);
    return accessToken;
  } catch (e) {
    const needsReAuth = (e as Error & { needsReAuth?: boolean }).needsReAuth;
    if (needsReAuth) throw e;
    return null;
  }
}

export async function resolveGoogleCalendarAuth(
  propertyId?: string | null
): Promise<GoogleCalendarAuth | null> {
  const pid = (propertyId ?? '').trim();
  const calendarId = await resolveGoogleCalendarId(pid || undefined);
  if (!calendarId) return null;

  if (pid) {
    const oauthToken = await tryUserOAuthAccessToken(pid);
    if (oauthToken) {
      return { calendarId, accessToken: oauthToken, authSource: 'user_oauth' };
    }
  }

  const serviceAccount = await resolveGoogleServiceAccount();
  if (!serviceAccount) return null;

  const accessToken = await getServiceAccountAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/calendar.events'
  );
  return { calendarId, accessToken, authSource: 'service_account' };
}

export async function resolveGoogleSheetsAuth(
  propertyId?: string | null
): Promise<GoogleSheetsAuth | null> {
  const pid = (propertyId ?? '').trim();
  const spreadsheetId = await resolveGoogleSpreadsheetId(pid || undefined);
  if (!spreadsheetId) return null;

  if (pid) {
    const oauthToken = await tryUserOAuthAccessToken(pid);
    if (oauthToken) {
      return { spreadsheetId, accessToken: oauthToken, authSource: 'user_oauth' };
    }
  }

  const serviceAccount = await resolveGoogleServiceAccount();
  if (!serviceAccount) return null;

  const accessToken = await getServiceAccountAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/spreadsheets'
  );
  return { spreadsheetId, accessToken, authSource: 'service_account' };
}
