/**
 * telegram-global-settings — shared Telegram bot token for Notifications modules.
 * GET/PATCH/POST (verify_global_telegram_bot). Property or parking scope via query param.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import {
  getParkingTelegramGlobalBotAdminStatus,
  getPropertyTelegramGlobalBotAdminStatus,
  patchParkingTelegramGlobalBotToken,
  patchPropertyTelegramGlobalBotToken,
  verifyTelegramBotTokenOnly,
} from '../_shared/telegramGlobalBotToken.ts';
import {
  ensureTelegramAssetSettings,
  resolveTelegramAssetAccess,
} from '../_shared/telegramAssetScope.ts';
import {
  parseAction,
  telegramUnknownAction,
  telegramVerifyResponse,
} from '../_shared/telegramSettingsHttp.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('telegram-global-settings', async (req) => {
  const asset = await resolveTelegramAssetAccess(req);
  await ensureTelegramAssetSettings(asset);

  if (req.method === 'GET') {
    const data =
      asset.kind === 'property'
        ? await getPropertyTelegramGlobalBotAdminStatus(asset.id)
        : await getParkingTelegramGlobalBotAdminStatus(asset.id);
    return jsonSuccess(req, data);
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const action = parseAction(body).trim();

    if (action === 'verify_global_telegram_bot') {
      const token = typeof body.botToken === 'string' ? body.botToken.trim() : '';
      if (!token) {
        const saved =
          asset.kind === 'property'
            ? await getPropertyTelegramGlobalBotAdminStatus(asset.id)
            : await getParkingTelegramGlobalBotAdminStatus(asset.id);
        if (!saved.botToken) {
          return jsonError(req, 'Bot token is required');
        }
        return telegramVerifyResponse(req, {
          getMe: await verifyTelegramBotTokenOnly(saved.botToken),
        });
      }
      return telegramVerifyResponse(req, {
        getMe: await verifyTelegramBotTokenOnly(token),
      });
    }

    return telegramUnknownAction(req, action, 'Use verify_global_telegram_bot');
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (body.telegramGlobalBotToken === undefined) {
      return jsonError(req, 'telegramGlobalBotToken is required');
    }
    if (body.telegramGlobalBotToken !== null && typeof body.telegramGlobalBotToken !== 'string') {
      return jsonError(req, 'telegramGlobalBotToken must be a string or null');
    }

    const data =
      asset.kind === 'property'
        ? await patchPropertyTelegramGlobalBotToken(
            asset.id,
            body.telegramGlobalBotToken as string | null
          )
        : await patchParkingTelegramGlobalBotToken(
            asset.id,
            body.telegramGlobalBotToken as string | null
          );

    return jsonSuccess(req, data);
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
