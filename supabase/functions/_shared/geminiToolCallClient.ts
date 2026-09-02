/**
 * Gemini tool-call client with structured output.
 * Reuses the hardened AI stack: key rotation, model routing, quota checks, and cache.
 */

import { getModelConfig, geminiGenerateContentUrl, type AiFeature } from './aiModelRouter.ts';
import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  nextGeminiKeyStartIndex,
  providerError,
  shouldTryNextProvider,
} from './aiGeminiKeys.ts';
import { assertOrgAndPropertyAiQuota, recordAiUsage, type AiActorType } from './aiUsageService.ts';
import {
  computePromptFingerprint,
  getCachedAiResponse,
  setCachedAiResponse,
} from './aiQuotaCache.ts';

export type GeminiToolDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type GeminiToolCallResult = {
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  text: string | null;
  /** Credits this call consumed — 0 on a cache hit. Callers looping rounds should sum this. */
  creditsConsumed: number;
  /**
   * Raw model `content.parts` from the Gemini response (includes `thoughtSignature` when present).
   * Echo these verbatim into the next request's history — do not rebuild functionCall parts.
   */
  modelParts?: GeminiContentPart[];
};

export type GeminiContentPart =
  | { text: string; thoughtSignature?: string }
  | { functionCall: { name: string; args: Record<string, unknown> }; thoughtSignature?: string }
  | {
      functionResponse: { name: string; response: Record<string, unknown> };
      thoughtSignature?: string;
    }
  | { inlineData: { mimeType: string; data: string }; thoughtSignature?: string };

export type GeminiContent = { role: 'user' | 'model'; parts: GeminiContentPart[] };

export type GeminiStructuredResult<T> = {
  data: T | null;
  text: string | null;
  creditsConsumed: number;
};

export type GeminiToolCallOptions = {
  feature: AiFeature;
  organizationId: string;
  propertyId?: string | null;
  systemPrompt: string;
  userPrompt: string;
  tools?: GeminiToolDeclaration[];
  toolMode?: 'auto' | 'any' | 'none';
  maxOutputTokens?: number;
  temperature?: number;
  cacheInputs?: Record<string, unknown>;
  cacheDisabled?: boolean;
  /**
   * Full conversation turns (user message / model function calls / function responses) for a
   * multi-round tool-calling loop — used instead of the single `userPrompt` turn when set.
   * Callers looping rounds (e.g. dashboard-assistant-chat) should also pass `cacheDisabled: true`
   * since history differs every round and a cache hit would return a stale tool response.
   */
  history?: GeminiContent[];
  /** Who triggered this call, for usage attribution (see aiUsageService.ts#RecordAiUsageInput). */
  actorUserId?: string | null;
  actorType?: AiActorType;
};

function buildGeminiRequestBody(
  modelConfig: ReturnType<typeof getModelConfig>,
  options: GeminiToolCallOptions
): Record<string, unknown> {
  const tools = options.tools?.map((t) => ({
    functionDeclarations: [{ name: t.name, description: t.description, parameters: t.parameters }],
  }));

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0,
    maxOutputTokens: options.maxOutputTokens ?? modelConfig.defaultMaxOutputTokens,
  };
  // Some Gemini models (e.g. gemini-3.5-flash-lite) reject thinkingBudget: 0 as INVALID_ARGUMENT.
  // Only send thinkingConfig when a non-zero budget is configured.
  if (modelConfig.thinkingBudget !== 0) {
    generationConfig.thinkingConfig = { thinkingBudget: modelConfig.thinkingBudget };
  }

  const conversationTurns =
    options.history && options.history.length > 0
      ? options.history
      : [{ role: 'user' as const, parts: [{ text: options.userPrompt }] }];

  const body: Record<string, unknown> = {
    contents: [
      { role: 'user', parts: [{ text: options.systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood.' }] },
      ...conversationTurns,
    ],
    generationConfig,
  };

  if (tools) {
    body.tools = tools;
    if (options.toolMode === 'any') {
      body.toolConfig = { functionCallingConfig: { mode: 'ANY' } };
    } else if (options.toolMode === 'none') {
      body.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
    }
  }

  return body;
}

function parseToolCalls(json: unknown): GeminiToolCallResult['toolCalls'] {
  const candidates =
    (json as { candidates?: Array<{ content?: { parts?: unknown[] } }> }).candidates ?? [];
  const calls: GeminiToolCallResult['toolCalls'] = [];
  for (const candidate of candidates) {
    const parts = (candidate.content?.parts ?? []) as Array<{
      functionCall?: { name?: string; args?: Record<string, unknown> };
    }>;
    for (const part of parts) {
      if (part.functionCall?.name) {
        calls.push({ name: part.functionCall.name, arguments: part.functionCall.args ?? {} });
      }
    }
  }
  return calls;
}

/** Preserve thoughtSignature / thought_signature on model parts for multi-round tool loops. */
function parseModelParts(json: unknown): GeminiContentPart[] {
  const candidates =
    (json as { candidates?: Array<{ content?: { parts?: unknown[] } }> }).candidates ?? [];
  const rawParts = (candidates[0]?.content?.parts ?? []) as Array<Record<string, unknown>>;
  const out: GeminiContentPart[] = [];
  for (const part of rawParts) {
    const signature =
      (typeof part.thoughtSignature === 'string' && part.thoughtSignature) ||
      (typeof part.thought_signature === 'string' && part.thought_signature) ||
      undefined;
    if (part.functionCall && typeof part.functionCall === 'object') {
      const fc = part.functionCall as { name?: string; args?: Record<string, unknown> };
      if (!fc.name) continue;
      out.push({
        functionCall: { name: fc.name, args: fc.args ?? {} },
        ...(signature ? { thoughtSignature: signature } : {}),
      });
      continue;
    }
    if (typeof part.text === 'string') {
      out.push({ text: part.text, ...(signature ? { thoughtSignature: signature } : {}) });
      continue;
    }
    if (part.inlineData && typeof part.inlineData === 'object') {
      const data = part.inlineData as { mimeType?: string; data?: string };
      if (data.mimeType && data.data) {
        out.push({
          inlineData: { mimeType: data.mimeType, data: data.data },
          ...(signature ? { thoughtSignature: signature } : {}),
        });
      }
    }
  }
  return out;
}

export async function callGeminiToolCall(
  options: GeminiToolCallOptions
): Promise<GeminiToolCallResult> {
  await assertOrgAndPropertyAiQuota(
    options.organizationId,
    options.propertyId ?? null,
    options.feature
  );

  const modelConfig = getModelConfig(options.feature);
  const fingerprint = options.cacheDisabled
    ? ''
    : await computePromptFingerprint({
        system: options.systemPrompt,
        user: options.userPrompt,
        tools: options.tools?.map((t) => t.name),
        extras: options.cacheInputs,
      });

  if (!options.cacheDisabled && fingerprint) {
    const cached = await getCachedAiResponse(options.feature, fingerprint);
    if (cached) {
      // Treat cached text as JSON-encoded tool calls if possible; otherwise plain text.
      let toolCalls: GeminiToolCallResult['toolCalls'] = [];
      let text: string | null = cached.responseText;
      try {
        const parsed = JSON.parse(cached.responseText);
        if (Array.isArray(parsed.toolCalls)) {
          toolCalls = parsed.toolCalls;
          text = parsed.text ?? null;
        } else if (Array.isArray(parsed)) {
          toolCalls = parsed;
          text = null;
        }
      } catch {
        /* cached response is plain text */
      }
      const { creditsConsumed } = await recordAiUsage({
        feature: options.feature,
        organizationId: options.organizationId,
        propertyId: options.propertyId ?? null,
        provider: cached.provider,
        model: cached.model,
        inputTokens: cached.inputTokens,
        outputTokens: cached.outputTokens,
        estimatedCostUsd: cached.estimatedCostUsd,
        cacheHit: true,
        actorUserId: options.actorUserId ?? null,
        actorType: options.actorType,
      });
      return { toolCalls, text, creditsConsumed };
    }
  }

  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const startIndex = nextGeminiKeyStartIndex(keys.length);
  const body = buildGeminiRequestBody(modelConfig, options);

  let lastError: Error | null = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(startIndex + i) % keys.length];
    const url = `${geminiGenerateContentUrl(modelConfig.model)}?key=${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const resJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const message = providerError(resJson, `Gemini API returned ${res.status}`);
        if (shouldTryNextProvider(res.status) && i < keys.length - 1) {
          console.warn(`[geminiToolCallClient] key ${i} failed (${res.status}), trying next key`);
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      const { inputTokens, outputTokens } = extractGeminiUsage(resJson);
      const toolCalls = parseToolCalls(resJson);
      const text = extractGeminiText(resJson);
      const modelParts = parseModelParts(resJson);

      const { creditsConsumed } = await recordAiUsage({
        feature: options.feature,
        organizationId: options.organizationId,
        propertyId: options.propertyId ?? null,
        provider: 'gemini',
        model: modelConfig.model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: undefined,
        actorUserId: options.actorUserId ?? null,
        actorType: options.actorType,
      });

      if (!options.cacheDisabled && fingerprint) {
        const cacheText = JSON.stringify({ toolCalls, text });
        await setCachedAiResponse(options.feature, fingerprint, {
          provider: 'gemini',
          model: modelConfig.model,
          responseText: cacheText,
          inputTokens,
          outputTokens,
          estimatedCostUsd: 0,
        });
      }

      return { toolCalls, text, creditsConsumed, modelParts };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < keys.length - 1) {
        console.warn(`[geminiToolCallClient] key ${i} error: ${lastError.message}`);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Gemini tool call failed');
}

export async function callGeminiStructured<T>(
  options: Omit<GeminiToolCallOptions, 'tools' | 'toolMode'>,
  schema: { type: string; properties: Record<string, unknown>; required?: string[] }
): Promise<GeminiStructuredResult<T>> {
  const responseFormat = {
    name: 'extract_structured_data',
    description: 'Extract structured data matching the requested schema.',
    parameters: schema,
  };

  const result = await callGeminiToolCall({
    ...options,
    tools: [responseFormat],
    toolMode: 'any',
  });

  const call = result.toolCalls[0];
  if (!call?.arguments) {
    return { data: null, text: result.text, creditsConsumed: result.creditsConsumed };
  }
  return {
    data: call.arguments as T,
    text: result.text,
    creditsConsumed: result.creditsConsumed,
  };
}
