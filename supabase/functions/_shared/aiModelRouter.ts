/**
 * Central model routing for platform AI features — keeps Flash vs Flash-Lite tiering
 * in one place instead of hard-coded model strings per service.
 *
 * Tiering guidance:
 * - flash_lite: cheap, fast text-only tasks that do not need reasoning (classify, caption,
 *   simple map, text verify, polish).
 * - flash: vision, structured JSON with many fields, multi-step reasoning, safety-critical
 *   validation (receipts, IDs, booking summaries, templates, dashboard assistant).
 * - live: native audio (voice receptionist).
 */

export const AI_FEATURES = [
  'receipt_validation',
  'inbox_suggest',
  'inbox_auto_reply',
  'marketing_caption',
  'marketing_template',
  'import_column_map',
  'voice_polish',
  'ai_integration_verify',
  'booking_ai_summary_guests',
  'booking_ai_summary_pets',
  'booking_ai_summary_pricing',
  'voice_receptionist',
  'dashboard_assistant',
  'smart_pricing',
  'host_analytics',
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

export type AiModelTier = 'flash_lite' | 'flash' | 'live';

export type AiModelConfig = {
  model: string;
  tier: AiModelTier;
  /** USD per 1M input tokens (text/image; audio uses separate rates for Live). */
  inputUsdPer1M: number;
  /** USD per 1M output tokens. */
  outputUsdPer1M: number;
  /** Default max output tokens for this feature. */
  defaultMaxOutputTokens: number;
  /** Whether thinking tokens should be budgeted for this task. */
  thinkingBudget: number;
};

/** Authoritative feature → model map. */
const FEATURE_MODELS: Record<AiFeature, AiModelConfig> = {
  receipt_validation: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 512,
    thinkingBudget: 0,
  },
  inbox_suggest: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 256,
    thinkingBudget: 0,
  },
  inbox_auto_reply: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 256,
    thinkingBudget: 0,
  },
  marketing_caption: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 256,
    thinkingBudget: 0,
  },
  marketing_template: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 1024,
    thinkingBudget: 0,
  },
  import_column_map: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 1024,
    thinkingBudget: 0,
  },
  voice_polish: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 512,
    thinkingBudget: 0,
  },
  ai_integration_verify: {
    model: 'gemini-3.1-flash-lite',
    tier: 'flash_lite',
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 1.5,
    defaultMaxOutputTokens: 16,
    thinkingBudget: 0,
  },
  booking_ai_summary_guests: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 512,
    thinkingBudget: 0,
  },
  booking_ai_summary_pets: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 512,
    thinkingBudget: 0,
  },
  booking_ai_summary_pricing: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 512,
    thinkingBudget: 0,
  },
  voice_receptionist: {
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    tier: 'live',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 1024,
    thinkingBudget: 0,
  },
  dashboard_assistant: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 2048,
    thinkingBudget: 0,
  },
  smart_pricing: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 768,
    thinkingBudget: 0,
  },
  host_analytics: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
    defaultMaxOutputTokens: 1024,
    thinkingBudget: 0,
  },
};

/**
 * Optional local/dev override: `GEMINI_MODEL_OVERRIDE_<FEATURE>` (e.g.
 * `GEMINI_MODEL_OVERRIDE_DASHBOARD_ASSISTANT=gemini-3.5-flash-lite`) or a global
 * `GEMINI_MODEL_OVERRIDE`. Used when free-tier quota is exhausted on the default model.
 * Does not change pricing metadata — only the model id sent to Gemini.
 */
export function getModelConfig(feature: AiFeature): AiModelConfig {
  const base = FEATURE_MODELS[feature];
  const featureKey = `GEMINI_MODEL_OVERRIDE_${feature.toUpperCase()}`;
  const override =
    (typeof Deno !== 'undefined' ? Deno.env.get(featureKey) : undefined)?.trim() ||
    (typeof Deno !== 'undefined' ? Deno.env.get('GEMINI_MODEL_OVERRIDE') : undefined)?.trim();
  if (!override) return base;
  return { ...base, model: override };
}

export function geminiGenerateContentUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function estimateTokenCostUsd(
  config: AiModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  const input = (inputTokens / 1_000_000) * config.inputUsdPer1M;
  const output = (outputTokens / 1_000_000) * config.outputUsdPer1M;
  return Math.round((input + output) * 1_000_000) / 1_000_000;
}

export function isValidAiFeature(value: string): value is AiFeature {
  return (AI_FEATURES as readonly string[]).includes(value);
}
