/**
 * Smart Pricing — optional AI rationale + sanity pass (Gemini, Groq fallback).
 *
 * Additive only: takes the deterministic engine's computed curve and returns
 *   - a short plain-language rationale per season bucket
 *   - warnings where the curve looks off vs. the property's realised history
 *   - suggested min / max price when the host left them blank
 * It NEVER changes a rate. Any failure (no keys, quota, kill switch, bad JSON) → null,
 * and the caller falls back to engine-only output.
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  nextGeminiKeyStartIndex,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import {
  assertOrgAndPropertyAiQuota,
  recordAiUsage,
  resolveOrgIdForProperty,
} from './aiUsageService.ts';
import type { SmartPricingAiOutput, SmartPricingComputation } from './smartPricingRun.ts';

const FEATURE = 'smart_pricing' as const;
const CONFIG = getModelConfig(FEATURE);
const GEMINI_URL = geminiGenerateContentUrl(CONFIG.model);

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    seasonRationales: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          text: { type: 'STRING' },
        },
        required: ['label', 'text'],
      },
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestedMinPrice: { type: 'NUMBER' },
    suggestedMaxPrice: { type: 'NUMBER' },
  },
  required: ['seasonRationales', 'warnings'],
} as const;

type MonthBucket = {
  month: string;
  nights: number;
  avgBase: number;
  avgRecommended: number;
};

function monthBuckets(comp: SmartPricingComputation): MonthBucket[] {
  const map = new Map<string, { nights: number; base: number; rec: number }>();
  for (const r of comp.results) {
    if (r.skipped !== null) continue;
    const key = r.date.slice(0, 7);
    const acc = map.get(key) ?? { nights: 0, base: 0, rec: 0 };
    acc.nights += 1;
    acc.base += r.baseRate;
    acc.rec += r.recommendedRate;
    map.set(key, acc);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      nights: v.nights,
      avgBase: Math.round(v.base / v.nights),
      avgRecommended: Math.round(v.rec / v.nights),
    }));
}

export function buildSmartPricingAiPrompt(comp: SmartPricingComputation): {
  system: string;
  user: string;
} {
  const s = comp.settings;
  const buckets = monthBuckets(comp);
  const system = [
    "You are a vacation-rental revenue analyst. You are given a deterministic pricing engine's",
    'output for one property and its own booking history. You do NOT set prices.',
    'Return ONLY JSON matching the schema. Rules:',
    '- seasonRationales: 2-5 short (<=160 char) plain-language notes a host can read, one per',
    '  notable month/season, explaining why that period is priced up or down.',
    '- warnings: 0-4 short flags where the recommended curve looks off vs. the realised history',
    "  (e.g. a known peak month barely moved, or a discount below the host's realised median).",
    '- suggestedMinPrice / suggestedMaxPrice: ONLY when the host has not set them — a sensible',
    '  floor (~0.6-0.75x base) and ceiling (~2.5-3.5x base) in PHP. Omit when already set.',
    '- Never invent facts. Never tell the host to leave the platform. Keep a professional tone.',
  ].join('\n');

  const user = [
    `Property base rate: weekday PHP ${comp.base.weekday}, weekend PHP ${comp.base.weekend}.`,
    `History confidence: ${comp.historyConfidence}.`,
    `Host min price: ${s.minPrice ?? 'not set'}. Host max price: ${s.maxPrice ?? 'not set'}.`,
    `Aggressiveness: ${s.aggressiveness}. Rounding: ${s.rounding}.`,
    `Engine summary: ${comp.summary.nightsChanged}/${comp.summary.nightsComputed} nights changed, avg ${comp.summary.avgDeltaPct}%.`,
    'Month buckets (avg base -> avg recommended, nights):',
    ...buckets.map(
      (b) => `  ${b.month}: PHP ${b.avgBase} -> PHP ${b.avgRecommended} (${b.nights} nights)`
    ),
    s.seasonRules.length > 0
      ? `Season rules: ${s.seasonRules.map((r) => `${r.name} ${r.startDate}..${r.endDate} ${r.percentage > 0 ? '+' : ''}${r.percentage}%`).join('; ')}`
      : 'Season rules: using the property holiday-rule defaults.',
    'Emit one JSON object.',
  ].join('\n');

  return { system, user };
}

export function parseSmartPricingAiJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fence?.[1]?.trim() || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  return JSON.parse(candidate);
}

export function shapeSmartPricingAiOutput(
  raw: unknown,
  hostMinSet: boolean,
  hostMaxSet: boolean
): SmartPricingAiOutput {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rationales = Array.isArray(obj.seasonRationales) ? obj.seasonRationales : [];
  const warnings = Array.isArray(obj.warnings) ? obj.warnings : [];
  const numOrNull = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  return {
    seasonRationales: rationales
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((r) => ({
        label: String(r.label ?? '').slice(0, 60),
        text: String(r.text ?? '').slice(0, 240),
      }))
      .filter((r) => r.label && r.text)
      .slice(0, 5),
    warnings: warnings
      .filter((w): w is string => typeof w === 'string')
      .map((w) => w.slice(0, 240))
      .filter(Boolean)
      .slice(0, 4),
    suggestedMinPrice: hostMinSet ? null : numOrNull(obj.suggestedMinPrice),
    suggestedMaxPrice: hostMaxSet ? null : numOrNull(obj.suggestedMaxPrice),
  };
}

export type SmartPricingAiResult = {
  output: SmartPricingAiOutput;
  creditsConsumed: number;
};

/** Attempt the AI pass. Returns null on any failure — caller uses engine-only output. */
export async function maybeRunSmartPricingAi(
  propertyId: string,
  comp: SmartPricingComputation
): Promise<SmartPricingAiResult | null> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) return null;

  const organizationId = await resolveOrgIdForProperty(propertyId);
  if (!organizationId) return null;

  try {
    await assertOrgAndPropertyAiQuota(organizationId, propertyId, FEATURE);
  } catch {
    return null;
  }

  const { system, user } = buildSmartPricingAiPrompt(comp);
  const startIdx = nextGeminiKeyStartIndex(keys.length);

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[(startIdx + attempt) % keys.length]!;
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: CONFIG.defaultMaxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: CONFIG.thinkingBudget },
          },
        }),
      });
      if (res.status === 429) continue;
      if (!res.ok) return null;

      const json = await res.json();
      const text = extractGeminiText(json);
      if (!text) continue;

      const parsed = parseSmartPricingAiJson(text);
      const usage = extractGeminiUsage(json);
      const { creditsConsumed } = await recordAiUsage({
        organizationId,
        propertyId,
        feature: FEATURE,
        provider: 'gemini',
        model: CONFIG.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        actorType: 'system',
      });

      return {
        output: shapeSmartPricingAiOutput(
          parsed,
          comp.settings.minPrice != null,
          comp.settings.maxPrice != null
        ),
        creditsConsumed,
      };
    } catch {
      /* try next key */
    }
  }

  return null;
}
