/**
 * voice-receptionist-voice-preview — Short Gemini TTS sample for the selected Live voice.
 * Auth: property team member (settings:edit) — preview spends API tokens.
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { previewGeminiLiveVoice } from '../_shared/geminiLiveVoicePreview.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('voice-receptionist-voice-preview', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  await resolveScopedPropertyAccess(req, 'settings:edit');

  const body = await readJsonBody(req);
  const voiceId = String(body.voiceId ?? body.voice_id ?? '').trim();
  if (!voiceId) {
    return jsonError(req, 'voiceId is required', 400);
  }

  try {
    const data = await previewGeminiLiveVoice(voiceId);
    return jsonSuccess(req, data);
  } catch (e) {
    const message = (e as Error).message || 'Could not preview voice';
    const status = message.includes('voiceId must be') || message.includes('not set') ? 400 : 502;
    return jsonError(req, message, status);
  }
});
