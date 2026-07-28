/**
 * Per-property integration readiness (DB) + platform-only env secrets.
 */

import { createServiceClient } from './orgAuth.ts';
import { trimOrEmpty } from './stringUtils.ts';

import {
  getPropertyTelegramCredentialsStatus,
  type TelegramCredentialsStatus,
} from './propertyTelegramCredentials.ts';

export type IntegrationFieldSource = 'db' | 'none';

export type IntegrationFieldStatus = {
  configured: boolean;
  source: IntegrationFieldSource;
};

export type PropertyGmailIntegrationStatus = {
  connected: boolean;
  source: 'db' | 'none';
  googleAccountEmail: string | null;
};

export type PropertyIntegrationStatus = {
  googleCalendar: IntegrationFieldStatus;
  googleSpreadsheet: IntegrationFieldStatus;
  gmail: PropertyGmailIntegrationStatus;
  telegram: {
    marketing: TelegramCredentialsStatus;
    staff: TelegramCredentialsStatus;
    admin: TelegramCredentialsStatus;
    finance: TelegramCredentialsStatus;
    maintenance: TelegramCredentialsStatus;
  };
};

export type PlatformSecretsStatus = {
  resendApiKeyConfigured: boolean;
  googleServiceAccountConfigured: boolean;
  gmailEncryptionKeyConfigured: boolean;
  gmailWebClientConfigured: boolean;
  geminiApiKeyConfigured: boolean;
  groqApiKeyConfigured: boolean;
};

function fieldStatus(fromDb: string): IntegrationFieldStatus {
  if (fromDb) return { configured: true, source: 'db' };
  return { configured: false, source: 'none' };
}

export function buildPlatformSecretsStatus(): PlatformSecretsStatus {
  return {
    resendApiKeyConfigured: !!trimOrEmpty(Deno.env.get('RESEND_API_KEY')),
    googleServiceAccountConfigured: !!trimOrEmpty(Deno.env.get('GOOGLE_SERVICE_ACCOUNT')),
    gmailEncryptionKeyConfigured: !!trimOrEmpty(Deno.env.get('GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY')),
    gmailWebClientConfigured: !!trimOrEmpty(Deno.env.get('GMAIL_API_WEB_CLIENT_JSON')),
    geminiApiKeyConfigured:
      !!trimOrEmpty(Deno.env.get('GEMINI_API_KEYS')) ||
      !!trimOrEmpty(Deno.env.get('GEMINI_API_KEY')),
    groqApiKeyConfigured: !!trimOrEmpty(Deno.env.get('GROQ_API_KEY')),
  };
}

export async function buildParkingIntegrationStatus(
  parkingId: string
): Promise<PropertyIntegrationStatus> {
  if (!parkingId.trim()) {
    throw new Error('parkingId required for integration status');
  }
  const sb = createServiceClient();

  const { data: parkingRow } = await sb
    .from('parking_settings')
    .select('gmail_connected, calendar_connected, sheets_connected')
    .eq('parking_id', parkingId)
    .maybeSingle();

  const gmailConnected = Boolean(parkingRow?.gmail_connected);
  const calendarConnected = Boolean(parkingRow?.calendar_connected);
  const sheetsConnected = Boolean(parkingRow?.sheets_connected);

  const scope = { parkingId };
  const [parkingTelegram, financeTelegram] = await Promise.all([
    getPropertyTelegramCredentialsStatus('parking', scope),
    getPropertyTelegramCredentialsStatus('finance', scope),
  ]);

  return {
    googleCalendar: { configured: calendarConnected, source: calendarConnected ? 'db' : 'none' },
    googleSpreadsheet: { configured: sheetsConnected, source: sheetsConnected ? 'db' : 'none' },
    gmail: {
      connected: gmailConnected,
      source: gmailConnected ? 'db' : 'none',
      googleAccountEmail: null,
    },
    telegram: {
      marketing: parkingTelegram,
      staff: parkingTelegram,
      admin: parkingTelegram,
      finance: financeTelegram,
      maintenance: parkingTelegram,
    },
  };
}

export async function buildPropertyIntegrationStatus(
  propertyId: string
): Promise<PropertyIntegrationStatus> {
  if (!propertyId.trim()) {
    throw new Error('propertyId required for integration status');
  }
  const sb = createServiceClient();

  const { data: appRow } = await sb
    .from('app_settings')
    .select('google_calendar_id, google_spreadsheet_id')
    .eq('property_id', propertyId)
    .maybeSingle();

  const calDb = trimOrEmpty(appRow?.google_calendar_id as string | null);
  const sheetDb = trimOrEmpty(appRow?.google_spreadsheet_id as string | null);

  const { data: gmailRow } = await sb
    .from('gmail_mail_integration')
    .select('refresh_token_encrypted, google_account_email')
    .eq('property_id', propertyId)
    .maybeSingle();

  const gmailConnected = !!trimOrEmpty(gmailRow?.refresh_token_encrypted as string | null);

  const [marketing, staff, admin, finance, maintenance, chat] = await Promise.all([
    getPropertyTelegramCredentialsStatus('marketing', propertyId),
    getPropertyTelegramCredentialsStatus('staff', propertyId),
    getPropertyTelegramCredentialsStatus('admin', propertyId),
    getPropertyTelegramCredentialsStatus('finance', propertyId),
    getPropertyTelegramCredentialsStatus('maintenance', propertyId),
    getPropertyTelegramCredentialsStatus('chat', propertyId),
  ]);

  return {
    googleCalendar: fieldStatus(calDb),
    googleSpreadsheet: fieldStatus(sheetDb),
    gmail: {
      connected: gmailConnected,
      source: gmailConnected ? 'db' : 'none',
      googleAccountEmail: gmailConnected
        ? trimOrEmpty(gmailRow?.google_account_email as string | null) || null
        : null,
    },
    telegram: { marketing, staff, admin, finance, maintenance, chat },
  };
}
