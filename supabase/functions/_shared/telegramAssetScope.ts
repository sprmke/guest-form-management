/**
 * Resolve property or parking scope for Telegram admin edge handlers.
 */

import { resolveScopedParkingAccess, readParkingIdFromUrl } from './parkingScope.ts';
import { readPropertyIdFromUrl, resolveScopedPropertyAccess } from './propertyScope.ts';
import { ensureTelegramParkingSettings } from './parkingTelegramSettingsSeed.ts';
import { ensurePropertySettings } from './propertySettingsSeed.ts';
import { ensureTelegramFinanceSettings } from './telegramFinance.ts';
import { ensureTelegramChatSettings } from './telegramChat.ts';
import { telegramSettingsPermission } from './telegramSettingsHttp.ts';

export type TelegramAssetScope = { kind: 'property'; id: string } | { kind: 'parking'; id: string };

export type TelegramDbScope = {
  propertyId?: string;
  parkingId?: string;
};

export function telegramDbScope(scope: TelegramAssetScope): TelegramDbScope {
  if (scope.kind === 'property') return { propertyId: scope.id };
  return { parkingId: scope.id };
}

export async function resolveTelegramAssetAccess(req: Request): Promise<TelegramAssetScope> {
  const url = new URL(req.url);
  const parkingId = readParkingIdFromUrl(url);
  const propertyId = readPropertyIdFromUrl(url);

  if (parkingId && propertyId) {
    throw new Response(
      JSON.stringify({ success: false, error: 'Provide only one of property_id or parking_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (parkingId) {
    const permission = req.method === 'GET' ? 'org:parkings:view' : 'org:parkings:manage';
    const { parkingRow } = await resolveScopedParkingAccess(req, permission);
    return { kind: 'parking', id: parkingRow.id };
  }

  const permission = telegramSettingsPermission(req);
  const { property } = await resolveScopedPropertyAccess(req, permission);
  return { kind: 'property', id: property.id };
}

export async function ensureTelegramAssetSettings(
  scope: TelegramAssetScope,
  channel?: import('./propertyTelegramCredentials.ts').TelegramChannel
): Promise<void> {
  if (scope.kind === 'property') {
    await ensurePropertySettings(scope.id);
    return;
  }
  await ensureTelegramParkingSettings(scope.id);
  if (channel === 'finance') {
    await ensureTelegramFinanceSettings({ parkingId: scope.id });
  }
  if (channel === 'chat') {
    await ensureTelegramChatSettings(undefined, scope.id);
  }
}
