/**
 * Batch-rewrite a finished voice transcript for Inbox persistence.
 * One Flash call for the whole call — not per-turn (avoids latency + token burn).
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  providerError,
  shouldTryNextProvider,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import {
  assertPropertyAiQuotaOptional,
  recordAiUsageOptional,
  type AiActorType,
} from './aiUsageService.ts';
import {
  buildCacheInputs,
  computePromptFingerprint,
  getCachedAiResponse,
  setCachedAiResponse,
} from './aiQuotaCache.ts';

const VOICE_POLISH_FEATURE = 'voice_polish' as const;
const CONFIG = getModelConfig(VOICE_POLISH_FEATURE);
const GEMINI_MODEL = CONFIG.model;
const GEMINI_URL = geminiGenerateContentUrl(GEMINI_MODEL);

export const VOICE_POLISH_MAX_TURNS = 40;
export const VOICE_POLISH_MAX_INPUT_CHARS = 2000;

export type VoicePolishTurn = { role: 'guest' | 'assistant'; text: string; at?: string };

export type VoicePolishUsageContext = {
  organizationId: string;
  propertyId?: string | null;
  actorUserId?: string | null;
  actorType?: AiActorType;
};

const SYSTEM_PROMPT =
  'You clean a voice-call transcript for a vacation-rental guest chat.\n' +
  'Input is a JSON array of {role, text} from live speech-to-text (often broken spacing, mid-word splits, or missing words).\n' +
  'Return ONLY a JSON array of the same length, each item {role, text} with the same roles.\n' +
  'Rewrite EACH text into one or more clear grammatical English sentences or questions.\n' +
  'Fix spacing (e.g. "tomo rrow" → "tomorrow", "ilablenext" → "available next").\n' +
  'Fix missing verbs/words (e.g. "You can the availability" → "You can check the availability").\n' +
  'Complete obvious cut-offs when the meaning is clear from context.\n' +
  'Guest lines are often truncated: use the surrounding turns (especially the assistant reply that follows) to recover the intended question, but never add facts nobody spoke.\n' +
  'Keep https URLs exactly as given (do not shorten or invent links).\n' +
  'For money amounts, prefer "pesos" over "PHP" in the written transcript.\n' +
  'Preserve meaning, numbers, dates, and proper nouns. No markdown or commentary.';

function normalizeWhitespace(raw: string): string {
  return raw.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Single Flash call to polish the entire transcript for Inbox.
 * Falls back to whitespace-normalized raw turns on any failure.
 */
export async function polishVoiceTranscriptTurns(
  turns: VoicePolishTurn[],
  usageContext?: VoicePolishUsageContext | null
): Promise<VoicePolishTurn[]> {
  if (!turns.length) return turns;

  const capped = turns.slice(0, VOICE_POLISH_MAX_TURNS).map((t) => ({
    role: t.role,
    text: normalizeWhitespace(t.text).slice(0, VOICE_POLISH_MAX_INPUT_CHARS),
    at: t.at,
  }));

  const keys = getGeminiApiKeys();
  if (!keys.length) return capped;

  try {
    await assertPropertyAiQuotaOptional(
      usageContext?.organizationId,
      usageContext?.propertyId,
      VOICE_POLISH_FEATURE
    );
  } catch {
    console.warn('[polishVoiceTranscriptTurns] quota exceeded — using raw transcript');
    return capped;
  }

  const payload = capped.map(({ role, text }) => ({ role, text }));
  const userPrompt = `Clean this transcript JSON:\n${JSON.stringify(payload)}`;
  const cacheKey = await computePromptFingerprint(buildCacheInputs(SYSTEM_PROMPT, userPrompt));
  const cached = await getCachedAiResponse(VOICE_POLISH_FEATURE, cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.responseText) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return applyPolishedArray(capped, parsed);
      }
    } catch {
      // ignore stale cache
    }
  }

  let lastError = 'polish unavailable';
  for (const apiKey of keys) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: CONFIG.defaultMaxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  role: { type: 'STRING' },
                  text: { type: 'STRING' },
                },
                required: ['role', 'text'],
              },
            },
            thinkingConfig: { thinkingBudget: CONFIG.thinkingBudget },
          },
        }),
      });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        lastError = providerError(json, `HTTP ${res.status}`);
        if (shouldTryNextProvider(res.status)) continue;
        break;
      }
      const text = extractGeminiText(json);
      if (!text) {
        const finishReason =
          (json as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]
            ?.finishReason ?? 'unknown';
        lastError = `empty candidate (finishReason=${finishReason})`;
        continue;
      }
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        lastError = 'response was not a non-empty JSON array';
        continue;
      }

      const usage = extractGeminiUsage(json);
      await recordAiUsageOptional(usageContext?.organizationId, {
        propertyId: usageContext?.propertyId,
        feature: VOICE_POLISH_FEATURE,
        provider: 'gemini',
        model: GEMINI_MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        actorUserId: usageContext?.actorUserId ?? null,
        actorType: usageContext?.actorType ?? 'guest',
      });

      await setCachedAiResponse(VOICE_POLISH_FEATURE, cacheKey, {
        provider: 'gemini',
        model: GEMINI_MODEL,
        responseText: text,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: 0,
      });
      return applyPolishedArray(capped, parsed);
    } catch (e) {
      lastError = (e as Error).message;
      if ((e as Error).name === 'AbortError') break;
    }
  }

  console.warn('[polishVoiceTranscriptTurns] fallback to raw:', lastError);
  return capped;
}

function applyPolishedArray(capped: VoicePolishTurn[], parsed: unknown): VoicePolishTurn[] {
  const out: VoicePolishTurn[] = [];
  for (let i = 0; i < capped.length; i++) {
    const src = capped[i]!;
    const row = (parsed as Array<Record<string, unknown>>)[i];
    const polished = row && typeof row.text === 'string' ? normalizeWhitespace(row.text) : src.text;
    out.push({
      role: src.role,
      text: polished || src.text,
      at: src.at,
    });
  }
  return out;
}
