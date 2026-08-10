/**
 * Structured AI tokens for Marketing Content Studio templates (Gemini / Groq).
 * Calendar MVP: returns a single calendar token payload (not full CalendarStyles).
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  getGroqApiKey,
  nextGeminiKeyStartIndex,
  shouldTryNextProvider,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import { assertOrgAiQuota, recordAiUsage } from './aiUsageService.ts';

const FEATURE = 'marketing_template' as const;
const GEMINI_MODEL = getModelConfig(FEATURE).model;
const GEMINI_URL = geminiGenerateContentUrl(GEMINI_MODEL);
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CALENDAR_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    layoutArchetype: { type: 'STRING' },
    palette: {
      type: 'OBJECT',
      properties: {
        primary: { type: 'STRING' },
        secondary: { type: 'STRING' },
        accent: { type: 'STRING' },
      },
      required: ['primary', 'secondary', 'accent'],
    },
    fontPairing: { type: 'STRING' },
    backgroundMood: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    label: { type: 'STRING' },
  },
  required: ['layoutArchetype', 'palette', 'fontPairing', 'backgroundMood', 'subtitle', 'label'],
} as const;

function parseAiJsonPayload(text: string): unknown {
  const attempts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) attempts.push(trimmed);

  const fullFence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  if (fullFence?.[1]?.trim()) attempts.push(fullFence[1].trim());

  const embeddedFence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (embeddedFence?.[1]?.trim()) attempts.push(embeddedFence[1].trim());

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) attempts.push(jsonMatch[0]);

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next candidate */
    }
  }

  throw new Error('AI generation returned unreadable JSON');
}

function isValidAiJsonText(text: string): boolean {
  try {
    parseAiJsonPayload(text);
    return true;
  } catch {
    return false;
  }
}

export type MarketingTemplateContentType = 'calendar' | 'design' | 'video';

export type CalendarLayoutArchetype =
  | 'bubble'
  | 'widget'
  | 'type-forward'
  | 'geo-pattern'
  | 'botanical'
  | 'photo-wash'
  | 'dusk-gradient';

export type CalendarFontPairing =
  'soft-sans' | 'editorial-serif' | 'playful-rounded' | 'modern-clean';

export type CalendarBackgroundMood =
  'solid-cream' | 'soft-gradient' | 'pattern-dots' | 'photo-wash';

/** Schema-constrained tokens; client compiles into CalendarStyles. */
export type CalendarTemplateTokens = {
  layoutArchetype: CalendarLayoutArchetype;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontPairing: CalendarFontPairing;
  backgroundMood: CalendarBackgroundMood;
  subtitle: string;
  label: string;
};

export type GenerateMarketingTemplateInput = {
  organizationId: string;
  propertyId: string;
  contentType: MarketingTemplateContentType;
  prompt: string;
  propertyName: string;
  amenitiesText?: string;
  availabilityText?: string;
  hasPropertyPhoto?: boolean;
  preferences?: {
    layoutArchetype?: string;
    fontPairing?: string;
    backgroundMood?: string;
  };
};

const CALENDAR_ARCHETYPES: CalendarLayoutArchetype[] = [
  'bubble',
  'widget',
  'type-forward',
  'geo-pattern',
  'botanical',
  'photo-wash',
  'dusk-gradient',
];

const CALENDAR_FONTS: CalendarFontPairing[] = [
  'soft-sans',
  'editorial-serif',
  'playful-rounded',
  'modern-clean',
];

const CALENDAR_BACKGROUNDS: CalendarBackgroundMood[] = [
  'solid-cream',
  'soft-gradient',
  'pattern-dots',
  'photo-wash',
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function clampLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 40);
  return cleaned || fallback;
}

function clampSubtitle(value: unknown): string {
  if (typeof value !== 'string') return 'Available dates';
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, 48);
  return cleaned || 'Available dates';
}

export function parseCalendarTemplateTokens(raw: unknown): CalendarTemplateTokens {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.tokens && typeof obj.tokens === 'object'
      ? (obj.tokens as Record<string, unknown>)
      : obj.calendar && typeof obj.calendar === 'object'
        ? (obj.calendar as Record<string, unknown>)
        : obj;
  const paletteRaw =
    nested.palette && typeof nested.palette === 'object'
      ? (nested.palette as Record<string, unknown>)
      : {};

  return {
    layoutArchetype: pickEnum(nested.layoutArchetype, CALENDAR_ARCHETYPES, 'bubble'),
    palette: {
      primary: normalizeHex(paletteRaw.primary, '#a48ee0'),
      secondary: normalizeHex(paletteRaw.secondary, '#f3edfd'),
      accent: normalizeHex(paletteRaw.accent, '#ff8fa8'),
    },
    fontPairing: pickEnum(nested.fontPairing, CALENDAR_FONTS, 'soft-sans'),
    backgroundMood: pickEnum(nested.backgroundMood, CALENDAR_BACKGROUNDS, 'solid-cream'),
    subtitle: clampSubtitle(nested.subtitle),
    label: clampLabel(nested.label, 'AI calendar'),
  };
}

function calendarSystemPrompt(): string {
  return [
    'You design vacation-rental availability calendar templates for Instagram/Facebook Stories & feed.',
    'Return ONLY JSON matching this schema (no markdown):',
    '{',
    '  "layoutArchetype": "bubble|widget|type-forward|geo-pattern|botanical|photo-wash|dusk-gradient",',
    '  "palette": { "primary": "#rrggbb", "secondary": "#rrggbb", "accent": "#rrggbb" },',
    '  "fontPairing": "soft-sans|editorial-serif|playful-rounded|modern-clean",',
    '  "backgroundMood": "solid-cream|soft-gradient|pattern-dots|photo-wash",',
    '  "subtitle": "short calendar subtitle under 48 chars",',
    '  "label": "short template name under 40 chars"',
    '}',
    'Rules:',
    '- Instagrammable soft-pastel hospitality look (lavender, mint, blush, butter, periwinkle) — elegant, not neon or corporate.',
    '- READABILITY IS NON-NEGOTIABLE: date numbers and labels must stay readable. Never pick near-white or ice-pale colors for primary/accent.',
    '- primary = mid-depth pastel fill for available days (saturated enough that dark ink can sit on it OR light ink on a deeper fill). Avoid #eaf4f4-style washed tints.',
    '- secondary = very light wash for the card background (near-white tint of primary, e.g. #f7f4ff).',
    '- accent = warmer/punchier today highlight, clearly distinct from primary (blush, peach, coral) — not the same hue family washed out.',
    '- Prefer secondary luminance very high; primary clearly deeper than secondary; accent saturated enough to pop as "today".',
    '- Use photo-wash backgroundMood only when a property photo is available or the prompt asks for photo.',
    '- label should be memorable and specific to the prompt vibe (not "AI calendar").',
    '- Do not invent layout fields outside the schema.',
  ].join('\n');
}

function buildUserPrompt(input: GenerateMarketingTemplateInput): string {
  const lines = [
    `Property: ${input.propertyName}`,
    `Content type: ${input.contentType}`,
    `Host prompt: ${input.prompt || '(no prompt — pick a tasteful pastel availability calendar)'}`,
  ];
  if (input.amenitiesText) lines.push(`Amenities: ${input.amenitiesText}`);
  if (input.availabilityText) lines.push(`Availability: ${input.availabilityText}`);
  if (input.hasPropertyPhoto) lines.push('Property photo: available');
  const prefs = input.preferences ?? {};
  if (prefs.layoutArchetype) lines.push(`Preferred layoutArchetype: ${prefs.layoutArchetype}`);
  if (prefs.fontPairing) lines.push(`Preferred fontPairing: ${prefs.fontPairing}`);
  if (prefs.backgroundMood) lines.push(`Preferred backgroundMood: ${prefs.backgroundMood}`);
  lines.push(
    'Hard requirement: date numbers and labels must stay high-contrast and readable on every day cell.'
  );
  lines.push('Emit one calendar token object as JSON.');
  return lines.join('\n');
}

async function generateJsonText(
  systemPrompt: string,
  userPrompt: string,
  usage: { organizationId: string; propertyId: string }
): Promise<string> {
  const keys = getGeminiApiKeys();
  let geminiSawKeys = keys.length > 0;
  let geminiQuotaHit = false;
  let geminiLastStatus: number | null = null;
  let geminiParseFailures = 0;

  const startIdx = nextGeminiKeyStartIndex(keys.length);
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[(startIdx + attempt) % keys.length]!;
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseSchema: CALENDAR_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      geminiLastStatus = res.status;
      if (res.status === 429) {
        geminiQuotaHit = true;
        continue;
      }
      if (!res.ok) {
        if (shouldTryNextProvider(res.status)) continue;
        break;
      }
      const json = await res.json();
      const finishReason =
        (json as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]?.finishReason ??
        '';
      const text = extractGeminiText(json);
      if (text && finishReason !== 'MAX_TOKENS' && isValidAiJsonText(text)) {
        const tokenUsage = extractGeminiUsage(json);
        await recordAiUsage({
          organizationId: usage.organizationId,
          propertyId: usage.propertyId,
          feature: FEATURE,
          provider: 'gemini',
          model: GEMINI_MODEL,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
        });
        return text;
      }
      if (text) geminiParseFailures += 1;
    } catch {
      /* try next key */
    }
  }

  const groq = getGroqApiKey();
  let groqLastStatus: number | null = null;
  if (groq) {
    try {
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
          temperature: 0.85,
          max_tokens: 512,
          response_format: { type: 'json_object' },
        }),
      });
      groqLastStatus = res.status;
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text && isValidAiJsonText(text)) {
          await recordAiUsage({
            organizationId: usage.organizationId,
            propertyId: usage.propertyId,
            feature: FEATURE,
            provider: 'groq',
            model: GROQ_MODEL,
            inputTokens: Number(json.usage?.prompt_tokens ?? 0),
            outputTokens: Number(json.usage?.completion_tokens ?? 0),
          });
          return text;
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (!geminiSawKeys && !groq) {
    throw new Error('AI generation unavailable — configure GEMINI_API_KEYS or GROQ_API_KEY');
  }
  if (geminiParseFailures > 0) {
    throw new Error('AI generation returned unreadable JSON');
  }
  if (geminiQuotaHit) {
    throw new Error(
      'AI generation unavailable — Gemini quota exceeded on all configured keys' +
        (groqLastStatus ? ` (Groq fallback HTTP ${groqLastStatus})` : groq ? '' : '')
    );
  }
  if (geminiLastStatus || groqLastStatus) {
    throw new Error(
      `AI generation unavailable — Gemini HTTP ${geminiLastStatus ?? 'n/a'}` +
        (groq ? `, Groq HTTP ${groqLastStatus ?? 'n/a'}` : '')
    );
  }
  throw new Error('AI generation unavailable — providers returned empty responses');
}

export async function generateMarketingTemplateTokens(
  input: GenerateMarketingTemplateInput
): Promise<{ contentType: MarketingTemplateContentType; tokens: CalendarTemplateTokens }> {
  if (input.contentType !== 'calendar') {
    throw new Error(`contentType "${input.contentType}" is not supported yet — use calendar`);
  }

  await assertOrgAiQuota(input.organizationId);

  const rawText = await generateJsonText(calendarSystemPrompt(), buildUserPrompt(input), {
    organizationId: input.organizationId,
    propertyId: input.propertyId,
  });
  const parsed = parseAiJsonPayload(rawText);

  return {
    contentType: 'calendar',
    tokens: parseCalendarTemplateTokens(parsed),
  };
}
