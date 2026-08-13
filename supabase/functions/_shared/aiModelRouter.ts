/**
 * Central model routing for platform AI features — keeps Flash vs Flash-Lite tiering
 * in one place instead of hard-coded model strings per service.
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
};

/** Authoritative feature → model map. Receipt stays on Flash for vision quality. */
const FEATURE_MODELS: Record<AiFeature, AiModelConfig> = {
  receipt_validation: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  inbox_suggest: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  inbox_auto_reply: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  marketing_caption: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  marketing_template: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  import_column_map: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  voice_polish: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  ai_integration_verify: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  booking_ai_summary_guests: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  booking_ai_summary_pets: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
  booking_ai_summary_pricing: {
    model: 'gemini-2.5-flash',
    tier: 'flash',
    inputUsdPer1M: 0.3,
    outputUsdPer1M: 2.5,
  },
};

export function getModelConfig(feature: AiFeature): AiModelConfig {
  return FEATURE_MODELS[feature];
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
