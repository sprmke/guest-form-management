/**
 * telegram-chat-settings — Admin GET/PATCH/POST for guest chat Telegram config.
 */

import { DatabaseService } from '../_shared/databaseService.ts';
import {
  ensureTelegramChatSettings,
  renderChatDraftPreview,
  sanitizeChatNewMessageTemplate,
  sendChatDraftPreview,
  serializeChatSettings,
  verifyChatTelegramEnv,
  type TelegramChatSettings,
} from '../_shared/telegramChat.ts';
import {
  handleTelegramRenderDraftPreview,
  handleTelegramSendDraftPreview,
  loadTelegramSettingsGetPayload,
  mergeTelegramCredentialsPatch,
  parseAction,
  gateTelegramEnabledPatch,
  telegramPatchNoFields,
  telegramPatchSuccessResponse,
  telegramUnknownAction,
  telegramVerifyResponse,
} from '../_shared/telegramSettingsHttp.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import {
  ensureTelegramAssetSettings,
  resolveTelegramAssetAccess,
  telegramDbScope,
} from '../_shared/telegramAssetScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import {
  parseTelegramVerifyOverrides,
  telegramCredentialsDto,
} from '../_shared/telegramCredentialsPatch.ts';

serveAuthenticated('telegram-chat-settings', async (req) => {
  const asset = await resolveTelegramAssetAccess(req);
  if (asset.kind !== 'property') {
    return jsonError(req, 'Chat Telegram settings are property-scoped only', 400);
  }
  const scope = telegramDbScope(asset);

  if (req.method === 'GET') {
    try {
      const data = await loadTelegramSettingsGetPayload(
        asset,
        'chat',
        () => DatabaseService.getTelegramChatSettings(scope.propertyId!),
        (row) => serializeChatSettings(row as unknown as TelegramChatSettings)
      );
      return jsonSuccess(req, data);
    } catch (e) {
      return jsonError(req, e instanceof Error ? e.message : 'Failed to load settings', 500);
    }
  }

  if (req.method === 'PATCH') {
    await ensureTelegramChatSettings(asset.id);
    const body = await readJsonBody(req);
    const gateResponse = await gateTelegramEnabledPatch(req, asset, body);
    if (gateResponse) return gateResponse;
    const patch: Record<string, unknown> = {};

    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;

    if (typeof body.notifyOnNewMessage === 'boolean') {
      patch.notify_on_new_message = body.notifyOnNewMessage;
    }

    if (typeof body.newMessageTemplate === 'string') {
      patch.new_message_template = sanitizeChatNewMessageTemplate(
        body.newMessageTemplate.slice(0, 8000)
      );
    }

    let finalPatch: Record<string, unknown>;
    try {
      finalPatch = await mergeTelegramCredentialsPatch(body, patch);
    } catch (e) {
      return jsonError(req, e instanceof Error ? e.message : 'Invalid credentials');
    }

    if (Object.keys(finalPatch).length === 0) {
      return telegramPatchNoFields(req);
    }

    const updated = await DatabaseService.updateTelegramChatSettings(finalPatch, scope.propertyId!);

    return telegramPatchSuccessResponse(req, {
      ...serializeChatSettings(updated as unknown as TelegramChatSettings),
      credentials: await telegramCredentialsDto('chat', scope),
    });
  }

  if (req.method === 'POST') {
    await ensureTelegramAssetSettings(asset, 'chat');
    const body = await readJsonBody(req);
    const action = parseAction(body);

    if (action === 'verify_chat_telegram_env') {
      const overrides = parseTelegramVerifyOverrides(body);
      return telegramVerifyResponse(req, await verifyChatTelegramEnv(scope.propertyId, overrides));
    }

    if (action === 'send_draft_preview') {
      return handleTelegramSendDraftPreview(req, body, (text) =>
        sendChatDraftPreview(text, scope.propertyId)
      );
    }

    if (action === 'render_draft_preview') {
      return handleTelegramRenderDraftPreview(req, body, (text) =>
        renderChatDraftPreview(text, scope.propertyId)
      );
    }

    return telegramUnknownAction(
      req,
      action,
      'Use verify_chat_telegram_env | send_draft_preview | render_draft_preview'
    );
  }

  throw new Error(`Method ${req.method} not allowed`);
});
