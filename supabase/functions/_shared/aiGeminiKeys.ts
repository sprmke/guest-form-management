/**
 * Shared Gemini/Groq key loading and HTTP status helpers for all AI edge services.
 *
 * Production: one paid GEMINI_API_KEY on the billing project (see docs/archive/operations/ai-platform-billing.md).
 * Local/dev: comma-separated GEMINI_API_KEYS from different projects is still supported for free-tier rotation.
 */

import { geminiGenerateContentUrl } from './aiModelRouter.ts';

let geminiKeyIndex = 0;

export function getGeminiApiKeys(): string[] {
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

export function getGroqApiKey(): string | null {
  return Deno.env.get('GROQ_API_KEY')?.trim() || null;
}

export function shouldTryNextProvider(status: number): boolean {
  return status === 429 || status === 403 || status >= 500;
}

/** Round-robin starting index for multi-key rotation (per isolate). */
export function nextGeminiKeyStartIndex(keyCount: number): number {
  if (keyCount <= 0) return 0;
  const start = geminiKeyIndex % keyCount;
  geminiKeyIndex = (geminiKeyIndex + 1) % keyCount;
  return start;
}

export function extractGeminiUsage(json: unknown): {
  inputTokens: number;
  outputTokens: number;
} {
  const meta = (json as { usageMetadata?: Record<string, number> }).usageMetadata ?? {};
  const inputTokens = Number(meta.promptTokenCount ?? meta.prompt_token_count ?? 0) || 0;
  const outputTokens =
    Number(meta.candidatesTokenCount ?? meta.candidates_token_count ?? 0) ||
    Number(meta.totalTokenCount ?? 0) - inputTokens ||
    0;
  return { inputTokens: Math.max(0, inputTokens), outputTokens: Math.max(0, outputTokens) };
}

export function extractGeminiText(json: unknown): string | null {
  const parts =
    (
      json as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
      }
    ).candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return text || null;
}

export function providerError(json: unknown, fallback: string): string {
  const err = json as { error?: { message?: string } };
  const message = err.error?.message?.trim();
  return message || fallback;
}

export type AiProviderProbeResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

/** Minimal provider probe for health checks — never exposes key counts or IDs. */
export async function probeAiProviderMinimal(): Promise<AiProviderProbeResult> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    return { ok: false, error: 'No Gemini API keys configured' };
  }

  const url = `${geminiGenerateContentUrl('gemini-2.0-flash-lite')}?key=${encodeURIComponent(keys[0])}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: ok' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 },
      }),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let message = `Gemini API returned ${res.status}`;
      try {
        const parsed = JSON.parse(errText) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (errText.trim()) message = errText.trim().slice(0, 240);
      }
      return { ok: false, latencyMs, error: message };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
