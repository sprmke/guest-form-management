/**
 * Batch-rewrite a finished voice transcript for Inbox persistence.
 * One Flash call for the whole call — not per-turn (avoids latency + token burn).
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const VOICE_POLISH_MAX_TURNS = 40;
export const VOICE_POLISH_MAX_INPUT_CHARS = 2000;

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

export type VoicePolishTurn = { role: 'guest' | 'assistant'; text: string; at?: string };

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
  turns: VoicePolishTurn[]
): Promise<VoicePolishTurn[]> {
  if (!turns.length) return turns;

  const capped = turns.slice(0, VOICE_POLISH_MAX_TURNS).map((t) => ({
    role: t.role,
    text: normalizeWhitespace(t.text).slice(0, VOICE_POLISH_MAX_INPUT_CHARS),
    at: t.at,
  }));

  const keys = geminiKeys();
  if (!keys.length) return capped;

  const payload = capped.map(({ role, text }) => ({ role, text }));
  const userPrompt = `Clean this transcript JSON:\n${JSON.stringify(payload)}`;

  let lastError = 'polish unavailable';
  for (const apiKey of keys) {
    try {
      const controller = new AbortController();
      // Runs after the call already ended (nobody is waiting on captions), so a generous
      // budget beats falling back to raw STT — the 8s ceiling was aborting every call.
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
            maxOutputTokens: 4096,
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
            // 2.5-flash reasons by default; thinking tokens would eat maxOutputTokens
            // and return an empty candidate, silently falling back to raw STT.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        lastError =
          (json as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
        if (res.status !== 429 && res.status !== 503) break;
        continue;
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

      const out: VoicePolishTurn[] = [];
      for (let i = 0; i < capped.length; i++) {
        const src = capped[i]!;
        const row = parsed[i] as Record<string, unknown> | undefined;
        const polished =
          row && typeof row.text === 'string' ? normalizeWhitespace(row.text) : src.text;
        out.push({
          role: src.role,
          text: polished || src.text,
          at: src.at,
        });
      }
      return out;
    } catch (e) {
      lastError = (e as Error).message;
      if ((e as Error).name === 'AbortError') break;
    }
  }

  console.warn('[polishVoiceTranscriptTurns] fallback to raw:', lastError);
  return capped;
}
