/**
 * Short Gemini TTS preview for admin voice picker (same prebuilt voices as Live).
 * Returns raw PCM base64 — clients wrap as WAV for playback.
 */

import { GEMINI_LIVE_VOICES, type GeminiLiveVoice } from './geminiLiveEphemeral.ts';

const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-pro-preview-tts',
] as const;

/** Fixed sample line so hosts can compare voices fairly. */
export const VOICE_PREVIEW_LINE =
  "Hi, I'm the Kame Homes receptionist. How can I help with your stay today?";

export const GEMINI_LIVE_VOICE_LABELS: Record<GeminiLiveVoice, string> = {
  Puck: 'Puck — Upbeat',
  Charon: 'Charon — Informative',
  Kore: 'Kore — Firm',
  Fenrir: 'Fenrir — Excitable',
  Aoede: 'Aoede — Breezy',
};

function geminiKeys(): string[] {
  const multi = Deno.env.get('GEMINI_API_KEYS')?.trim();
  if (multi) {
    return multi
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const single = Deno.env.get('GEMINI_API_KEY')?.trim();
  return single ? [single] : [];
}

export type VoicePreviewResult = {
  voiceId: GeminiLiveVoice;
  text: string;
  mimeType: string;
  sampleRateHz: number;
  audioBase64: string;
};

function parseSampleRate(mimeType: string): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  if (match?.[1]) {
    const rate = Number(match[1]);
    if (Number.isFinite(rate) && rate > 0) return rate;
  }
  return 24_000;
}

export async function previewGeminiLiveVoice(voiceIdRaw: string): Promise<VoicePreviewResult> {
  const voiceId = voiceIdRaw.trim() as GeminiLiveVoice;
  if (!GEMINI_LIVE_VOICES.includes(voiceId)) {
    throw new Error(`voiceId must be one of: ${GEMINI_LIVE_VOICES.join(', ')}`);
  }

  const keys = geminiKeys();
  if (!keys.length) {
    throw new Error('GEMINI_API_KEYS or GEMINI_API_KEY not set');
  }

  let lastError = 'voice preview unavailable';
  for (const model of TTS_MODELS) {
    for (const apiKey of keys) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Say warmly: ${VOICE_PREVIEW_LINE}` }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceId },
                  },
                },
              },
            }),
          }
        );
        clearTimeout(timer);
        const json = (await res.json()) as {
          error?: { message?: string };
          candidates?: Array<{
            content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
          }>;
        };
        if (!res.ok) {
          lastError = json.error?.message ?? `HTTP ${res.status}`;
          if (res.status !== 429 && res.status !== 503) break;
          continue;
        }
        const inline = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        const audioBase64 = inline?.data?.trim();
        if (!audioBase64) {
          lastError = 'empty audio candidate';
          continue;
        }
        const mimeType = inline?.mimeType?.trim() || 'audio/L16;rate=24000';
        return {
          voiceId,
          text: VOICE_PREVIEW_LINE,
          mimeType,
          sampleRateHz: parseSampleRate(mimeType),
          audioBase64,
        };
      } catch (e) {
        lastError = (e as Error).message;
        if ((e as Error).name === 'AbortError') break;
      }
    }
  }

  throw new Error(lastError);
}
