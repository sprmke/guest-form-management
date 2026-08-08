/**
 * AI column-header → booking field mapping (Gemini Flash primary, Groq Scout fallback).
 * Categorical status only — never numeric confidence scores.
 */

import {
  isBookingImportTargetFieldId,
  resolveBookingImportTargetId,
  serializeBookingImportTargetFields,
} from './importTargetSchemas.ts';

export const IMPORT_COLUMN_MAPPING_STATUSES = [
  'matched',
  'likely_matched',
  'ambiguous',
  'unmatched',
] as const;

export type ImportColumnMappingStatus = (typeof IMPORT_COLUMN_MAPPING_STATUSES)[number];

export type ImportColumnMappingEntry = {
  rawHeader: string;
  suggestedTarget: string | null;
  status: ImportColumnMappingStatus;
  reason: string;
};

export type ImportColumnMappingResult = {
  mappings: ImportColumnMappingEntry[];
  provider: 'gemini' | 'groq' | 'none';
  degraded: boolean;
};

export type ImportColumnMappingInput = {
  headers: string[];
  /** Up to 5 sample cell values per header (column-major). */
  samplesByHeader: Record<string, string[]>;
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_TIMEOUT_MS = 18_000;

let geminiKeyIndex = 0;

function getGeminiApiKeys(): string[] {
  const multi = Deno.env.get('GEMINI_API_KEYS')?.trim();
  if (multi) {
    return multi
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
  }
  const single = Deno.env.get('GEMINI_API_KEY')?.trim();
  return single ? [single] : [];
}

function getGroqApiKey(): string | null {
  return Deno.env.get('GROQ_API_KEY')?.trim() || null;
}

function shouldTryNextProvider(status: number): boolean {
  return status === 429 || status === 403 || status >= 500;
}

function normalizeMappingStatus(raw: unknown): ImportColumnMappingStatus {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (
    value === 'matched' ||
    value === 'likely_matched' ||
    value === 'ambiguous' ||
    value === 'unmatched'
  ) {
    return value;
  }
  return 'unmatched';
}

const MAPPING_STATUS_RANK: Record<ImportColumnMappingStatus, number> = {
  matched: 3,
  likely_matched: 2,
  ambiguous: 1,
  unmatched: 0,
};

/**
 * When AI maps two headers to the same target field, keep the higher-confidence
 * mapping (matched > likely_matched > ambiguous) and downgrade the other to
 * ambiguous with no suggested target so the user resolves the conflict manually.
 */
function resolveDuplicateSuggestedTargets(
  mappings: ImportColumnMappingEntry[]
): ImportColumnMappingEntry[] {
  const winnerByTarget = new Map<string, number>();

  for (let index = 0; index < mappings.length; index++) {
    const entry = mappings[index]!;
    const target = entry.suggestedTarget;
    if (!target) continue;

    const existingIndex = winnerByTarget.get(target);
    if (existingIndex === undefined) {
      winnerByTarget.set(target, index);
      continue;
    }

    const existing = mappings[existingIndex]!;
    const existingRank = MAPPING_STATUS_RANK[existing.status];
    const candidateRank = MAPPING_STATUS_RANK[entry.status];

    if (candidateRank > existingRank) {
      winnerByTarget.set(target, index);
    }
  }

  return mappings.map((entry, index) => {
    const target = entry.suggestedTarget;
    if (!target) return entry;

    const winnerIndex = winnerByTarget.get(target);
    if (winnerIndex === index) return entry;

    return {
      ...entry,
      suggestedTarget: null,
      status: 'ambiguous' as const,
      reason: `Duplicate target — resolve manually (${target})`,
    };
  });
}

function sanitizeMappingEntry(
  entry: Record<string, unknown>,
  rawHeader: string
): ImportColumnMappingEntry {
  let suggestedTarget =
    typeof entry.suggestedTarget === 'string' && entry.suggestedTarget.trim()
      ? entry.suggestedTarget.trim()
      : null;
  let status = normalizeMappingStatus(entry.status);
  const reason =
    typeof entry.reason === 'string' && entry.reason.trim()
      ? entry.reason.trim().slice(0, 240)
      : status === 'unmatched'
        ? 'No confident match'
        : 'Suggested by AI';

  if (suggestedTarget && !isBookingImportTargetFieldId(suggestedTarget)) {
    suggestedTarget = resolveBookingImportTargetId(suggestedTarget);
  }
  if (suggestedTarget && !isBookingImportTargetFieldId(suggestedTarget)) {
    suggestedTarget = null;
    status = 'unmatched';
  }

  if (!suggestedTarget && status !== 'unmatched') {
    status = 'unmatched';
  }

  return {
    rawHeader,
    suggestedTarget,
    status,
    reason,
  };
}

function buildDegradedMappings(headers: string[]): ImportColumnMappingEntry[] {
  return applyDeterministicHeaderMatches(
    headers.map((rawHeader) => {
      const resolved = resolveBookingImportTargetId(rawHeader);
      if (resolved) {
        return {
          rawHeader,
          suggestedTarget: resolved,
          status: 'matched' as const,
          reason: 'Column header matches booking field',
        };
      }
      return {
        rawHeader,
        suggestedTarget: null,
        status: 'unmatched' as const,
        reason: 'AI mapping unavailable — map manually',
      };
    })
  );
}

/** When a CSV header equals a canonical field id (or legacy alias), trust the header over AI drift. */
function applyDeterministicHeaderMatches(
  mappings: ImportColumnMappingEntry[]
): ImportColumnMappingEntry[] {
  return mappings.map((entry) => {
    const resolved = resolveBookingImportTargetId(entry.rawHeader);
    if (!resolved) return entry;
    return {
      ...entry,
      suggestedTarget: resolved,
      status: 'matched',
      reason: 'Column header matches booking field',
    };
  });
}

function buildPrompt(input: ImportColumnMappingInput): string {
  const targetFields = serializeBookingImportTargetFields();
  const columns = input.headers.map((header) => ({
    rawHeader: header,
    sampleValues: (input.samplesByHeader[header] ?? []).slice(0, 5),
  }));

  return (
    'Map each CSV column header to at most one canonical booking database field.\n' +
    'Return ONLY valid JSON with shape:\n' +
    '{\n' +
    '  "mappings": [\n' +
    '    {\n' +
    '      "rawHeader": string,\n' +
    '      "suggestedTarget": string | null,\n' +
    '      "status": "matched" | "likely_matched" | "ambiguous" | "unmatched",\n' +
    '      "reason": string\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'Rules:\n' +
    '- suggestedTarget MUST be one of the target field ids below, or null.\n' +
    '- Never map to status, file URLs, AI verdict columns, or workflow timestamps.\n' +
    '- Use matched when the header clearly equals a target id or obvious synonym.\n' +
    '- Use likely_matched for strong but not exact matches.\n' +
    '- Use ambiguous when multiple targets could fit.\n' +
    '- Use unmatched when no target fits.\n' +
    '- Do NOT output numeric confidence scores.\n' +
    '- Return exactly one mapping object per input column, same rawHeader values.\n\n' +
    `Target fields:\n${JSON.stringify(targetFields)}\n\n` +
    `Input columns:\n${JSON.stringify(columns)}`
  );
}

function extractGeminiText(json: unknown): string | null {
  const parts =
    (
      json as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    ).candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  return text || null;
}

function parseMappingsPayload(text: string, headers: string[]): ImportColumnMappingEntry[] | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { mappings?: unknown };
    if (!Array.isArray(parsed.mappings)) return null;

    const byHeader = new Map<string, Record<string, unknown>>();
    for (const row of parsed.mappings) {
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      const header = typeof record.rawHeader === 'string' ? record.rawHeader.trim() : '';
      if (header) byHeader.set(header, record);
    }

    const sanitized = headers.map((header) =>
      sanitizeMappingEntry(byHeader.get(header) ?? { rawHeader: header }, header)
    );
    return resolveDuplicateSuggestedTargets(sanitized);
  } catch {
    return null;
  }
}

async function tryGeminiMapping(
  prompt: string,
  headers: string[]
): Promise<ImportColumnMappingEntry[] | null> {
  const keys = getGeminiApiKeys();
  if (!keys.length) return null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[(geminiKeyIndex + attempt) % keys.length]!;
    geminiKeyIndex = (geminiKeyIndex + 1) % keys.length;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                mappings: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      rawHeader: { type: 'STRING' },
                      suggestedTarget: { type: 'STRING', nullable: true },
                      status: { type: 'STRING' },
                      reason: { type: 'STRING' },
                    },
                    required: ['rawHeader', 'status', 'reason'],
                  },
                },
              },
              required: ['mappings'],
            },
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (shouldTryNextProvider(res.status)) continue;
        return null;
      }

      const json = await res.json();
      const text = extractGeminiText(json);
      if (!text) continue;

      const mappings = parseMappingsPayload(text, headers);
      if (mappings) return mappings;
    } catch (error) {
      clearTimeout(timer);
      if ((error as Error).name === 'AbortError') break;
    }
  }

  return null;
}

async function tryGroqMapping(
  prompt: string,
  headers: string[]
): Promise<ImportColumnMappingEntry[] | null> {
  const groqKey = getGroqApiKey();
  if (!groqKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (shouldTryNextProvider(res.status)) return null;
      return null;
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content ?? '';
    return parseMappingsPayload(text, headers);
  } catch (error) {
    clearTimeout(timer);
    if ((error as Error).name !== 'AbortError') {
      console.warn('[importColumnMappingAi] Groq error:', (error as Error).message);
    }
    return null;
  }
}

/** Suggest booking-field mappings for CSV headers. Degrades to all-unmatched when AI is unavailable. */
export async function suggestImportColumnMappings(
  input: ImportColumnMappingInput
): Promise<ImportColumnMappingResult> {
  const headers = input.headers.filter((header) => header.trim().length > 0);
  if (!headers.length) {
    return { mappings: [], provider: 'none', degraded: true };
  }

  const prompt = buildPrompt({ ...input, headers });
  const geminiMappings = await tryGeminiMapping(prompt, headers);
  if (geminiMappings) {
    return {
      mappings: applyDeterministicHeaderMatches(geminiMappings),
      provider: 'gemini',
      degraded: false,
    };
  }

  const groqMappings = await tryGroqMapping(prompt, headers);
  if (groqMappings) {
    return {
      mappings: applyDeterministicHeaderMatches(groqMappings),
      provider: 'groq',
      degraded: false,
    };
  }

  console.warn('[importColumnMappingAi] All providers unavailable — degrading to unmatched');
  return {
    mappings: buildDegradedMappings(headers),
    provider: 'none',
    degraded: true,
  };
}
