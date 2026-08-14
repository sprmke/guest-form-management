/**
 * AI-assisted social captions for Marketing Content Studio (Gemini / Groq).
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  getGroqApiKey,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import { assertOrgAndPropertyAiQuota, recordAiUsage } from './aiUsageService.ts';
import {
  buildCacheInputs,
  computePromptFingerprint,
  getCachedAiResponse,
  setCachedAiResponse,
} from './aiQuotaCache.ts';

const FEATURE = 'marketing_caption' as const;
const CONFIG = getModelConfig(FEATURE);
const GEMINI_MODEL = CONFIG.model;
const GEMINI_URL = geminiGenerateContentUrl(GEMINI_MODEL);
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type MarketingCaptionInput = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  platform: 'facebook' | 'instagram';
  postType: 'post' | 'story';
  contentHint?: string;
  nightlyRate?: string;
  availabilityText?: string;
};

export async function generateMarketingCaption(input: MarketingCaptionInput): Promise<string> {
  await assertOrgAndPropertyAiQuota(input.organizationId, input.propertyId, FEATURE);

  const systemPrompt =
    'You write short, engaging social media captions for vacation rental properties in the Philippines. ' +
    'Use warm Filipino-English when natural. No hashtags unless asked. No markdown. ' +
    'Keep captions under 220 characters for stories, under 400 for feed posts.';

  const formatLabel = input.postType === 'story' ? 'Instagram/Facebook Story' : 'feed post';
  const userPrompt =
    `Property: ${input.propertyName}\n` +
    `Platform: ${input.platform}\n` +
    `Format: ${formatLabel}\n` +
    (input.nightlyRate ? `Rate: ${input.nightlyRate}\n` : '') +
    (input.availabilityText ? `Availability: ${input.availabilityText}\n` : '') +
    (input.contentHint ? `Creative: ${input.contentHint}\n` : '') +
    'Write one caption only — no quotes or labels.';

  const maxLen = input.postType === 'story' ? 220 : 400;
  const cacheKey = computePromptFingerprint(buildCacheInputs(FEATURE, systemPrompt, userPrompt));
  const cached = await getCachedAiResponse(cacheKey);
  if (cached) return cached.slice(0, maxLen);

  const keys = getGeminiApiKeys();
  for (const apiKey of keys) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: CONFIG.defaultMaxOutputTokens,
            thinkingConfig: { thinkingBudget: CONFIG.thinkingBudget },
          },
        }),
      });
      const json = await res.json();
      const text = extractGeminiText(json);
      if (text) {
        const usage = extractGeminiUsage(json);
        await recordAiUsage({
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          feature: FEATURE,
          provider: 'gemini',
          model: GEMINI_MODEL,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });
        await setCachedAiResponse(cacheKey, text, CONFIG.cacheTtlSeconds);
        return text.slice(0, maxLen);
      }
    } catch {
      /* try next key */
    }
  }

  const groq = getGroqApiKey();
  if (groq) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groq}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: CONFIG.defaultMaxOutputTokens,
      }),
    });
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (text) {
      await recordAiUsage({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        feature: FEATURE,
        provider: 'groq',
        model: GROQ_MODEL,
        inputTokens: Number(json.usage?.prompt_tokens ?? 0),
        outputTokens: Number(json.usage?.completion_tokens ?? 0),
      });
      await setCachedAiResponse(cacheKey, text, CONFIG.cacheTtlSeconds);
      return text.slice(0, maxLen);
    }
  }

  throw new Error('AI caption unavailable — configure GEMINI_API_KEYS or GROQ_API_KEY');
}
