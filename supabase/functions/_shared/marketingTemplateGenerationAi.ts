/**
 * Structured AI tokens for Marketing Content Studio templates (Gemini / Groq).
 * Calendar MVP: returns a single calendar token payload (not full CalendarStyles).
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

function groqKey(): string | null {
  return Deno.env.get('GROQ_API_KEY')?.trim() || null;
}

function extractGeminiText(json: unknown): string | null {
  const parts =
    (
      json as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    ).candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return text || null;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
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
  contentType: MarketingTemplateContentType;
  prompt: string;
  propertyName: string;
  amenitiesText?: string;
  availabilityText?: string;
  hasPropertyPhoto?: boolean;
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
    'You design vacation-rental availability calendar templates for Instagram/Facebook.',
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
    '- Soft pastel vacation aesthetic (lavender, mint, blush, butter, periwinkle) — Instagrammable, not neon or corporate.',
    '- primary = main tint; secondary = light wash; accent = today/highlight — all distinct #rrggbb hex.',
    '- Prefer secondary as a very light tint of primary.',
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
  lines.push('Emit one calendar token object as JSON.');
  return lines.join('\n');
}

async function generateJsonText(systemPrompt: string, userPrompt: string): Promise<string> {
  const keys = geminiKeys();
  for (const apiKey of keys) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const text = extractGeminiText(json);
      if (text) return text;
    } catch {
      /* try next key */
    }
  }

  const groq = groqKey();
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
        temperature: 0.85,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  }

  throw new Error('AI generation unavailable — configure GEMINI_API_KEYS or GROQ_API_KEY');
}

export async function generateMarketingTemplateTokens(
  input: GenerateMarketingTemplateInput
): Promise<{ contentType: MarketingTemplateContentType; tokens: CalendarTemplateTokens }> {
  if (input.contentType !== 'calendar') {
    throw new Error(`contentType "${input.contentType}" is not supported yet — use calendar`);
  }

  const rawText = await generateJsonText(calendarSystemPrompt(), buildUserPrompt(input));
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch {
    throw new Error('AI generation returned unreadable JSON');
  }

  return {
    contentType: 'calendar',
    tokens: parseCalendarTemplateTokens(parsed),
  };
}
