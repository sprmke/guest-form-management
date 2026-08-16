/**
 * AI reply suggestions for social inbox — Gemini/Groq with org context.
 */

import {
  extractGeminiText,
  extractGeminiUsage,
  getGeminiApiKeys,
  getGroqApiKey,
  providerError,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig } from './aiModelRouter.ts';
import {
  assertOrgAndPropertyAiQuota,
  recordAiUsage,
  type RecordAiUsageInput,
} from './aiUsageService.ts';
import {
  buildCacheInputs,
  computePromptFingerprint,
  getCachedAiResponse,
  setCachedAiResponse,
} from './aiQuotaCache.ts';
import { createServiceClient } from './orgAuth.ts';
import { buildAiGroundingFacts } from './inboxAiGuestContext.ts';
import { AI_SUGGEST_FALLBACK_REPLY, assertSafeGuestReply } from './inboxAiSafetyGuard.ts';

const INBOX_FEATURE = 'inbox_suggest' as const;
const CONFIG = getModelConfig(INBOX_FEATURE);
const GEMINI_MODEL = CONFIG.model;
const GEMINI_URL = geminiGenerateContentUrl(GEMINI_MODEL);
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type GeminiReplyResult = { text: string; usage: RecordAiUsageInput };

async function tryGeminiReply(
  systemPrompt: string,
  userPrompt: string,
  usageBase: Omit<RecordAiUsageInput, 'provider' | 'model' | 'inputTokens' | 'outputTokens'>
): Promise<GeminiReplyResult | null> {
  const keys = getGeminiApiKeys();
  if (!keys.length) return null;

  let lastError = 'GEMINI_API_KEYS not set';
  for (const apiKey of keys) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: CONFIG.defaultMaxOutputTokens,
            thinkingConfig: { thinkingBudget: CONFIG.thinkingBudget },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        lastError = providerError(json, `HTTP ${res.status}`);
        continue;
      }
      const text = extractGeminiText(json);
      if (text) {
        const usage = extractGeminiUsage(json);
        return {
          text,
          usage: {
            ...usageBase,
            provider: 'gemini',
            model: GEMINI_MODEL,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          },
        };
      }
      lastError = 'Empty Gemini response';
    } catch (e) {
      lastError = (e as Error).message;
    }
  }

  throw new Error(`Gemini: ${lastError}`);
}

async function tryGroqReply(
  systemPrompt: string,
  userPrompt: string,
  usageBase: Omit<RecordAiUsageInput, 'provider' | 'model' | 'inputTokens' | 'outputTokens'>
): Promise<GeminiReplyResult | null> {
  const key = getGroqApiKey();
  if (!key) return null;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: CONFIG.defaultMaxOutputTokens,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Groq: ${providerError(json, `HTTP ${res.status}`)}`);
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (text) {
    const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      text,
      usage: {
        ...usageBase,
        provider: 'groq',
        model: GROQ_MODEL,
        inputTokens: Number(usage?.prompt_tokens ?? 0),
        outputTokens: Number(usage?.completion_tokens ?? 0),
      },
    };
  }
  throw new Error('Groq: Empty response');
}

export type InboxAiProviderStatus = {
  available: boolean;
  geminiConfigured: boolean;
  groqConfigured: boolean;
  error: string | null;
};

/** Lightweight probe — used by automation settings to warn when auto-send cannot run. */
export async function checkInboxAiProviders(): Promise<InboxAiProviderStatus> {
  const geminiConfigured = getGeminiApiKeys().length > 0;
  const groqConfigured = !!getGroqApiKey();
  if (!geminiConfigured && !groqConfigured) {
    return {
      available: false,
      geminiConfigured,
      groqConfigured,
      error: 'Set GEMINI_API_KEYS or GROQ_API_KEY in supabase/.env.local',
    };
  }

  const probeSystem = 'Reply in one short sentence.';
  const probeUser = 'Guest asked: hello';

  const errors: string[] = [];
  if (geminiConfigured) {
    try {
      const probe = await tryGeminiReply(probeSystem, probeUser, {
        organizationId: '00000000-0000-0000-0000-000000000000',
        feature: 'ai_integration_verify',
      });
      if (probe?.text) {
        return { available: true, geminiConfigured, groqConfigured, error: null };
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (groqConfigured) {
    try {
      const probe = await tryGroqReply(probeSystem, probeUser, {
        organizationId: '00000000-0000-0000-0000-000000000000',
        feature: 'ai_integration_verify',
      });
      if (probe?.text) {
        return { available: true, geminiConfigured, groqConfigured, error: null };
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  return {
    available: false,
    geminiConfigured,
    groqConfigured,
    error: errors.join('; ') || 'AI providers unreachable',
  };
}

export type AiSuggestInput = {
  orgId: string;
  platform: string;
  conversationType: string;
  participantName: string | null;
  messages: Array<{ direction: string; body: string | null; sentAt: string }>;
  systemPromptOverride?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  inquiryCheckIn?: string | null;
  inquiryCheckOut?: string | null;
};

export type AiSuggestResult = {
  suggestion: string;
  flagged: boolean;
};

export async function suggestInboxReply(input: AiSuggestInput): Promise<AiSuggestResult> {
  const feature =
    input.platform === 'web' && input.conversationType === 'web_chat'
      ? ('inbox_auto_reply' as const)
      : INBOX_FEATURE;

  await assertOrgAndPropertyAiQuota(input.orgId, input.propertyId ?? null, feature);

  const sb = createServiceClient();
  const { data: orgRow } = await sb
    .from('organizations')
    .select('name, settings')
    .eq('id', input.orgId)
    .maybeSingle();
  const settings = (orgRow?.settings ?? {}) as Record<string, unknown>;
  const orgName =
    String(settings.contactName ?? '').trim() || String(orgRow?.name ?? '').trim() || 'our team';
  const safetyPolicy =
    'Answer normal guest inquiries helpfully using Known facts first, then Quick reply snippets when property facts are incomplete. ' +
    'Normal inquiries include availability, rates, location/address/map, tower/residence/unit, payment methods (including GCash account details when listed), cancellation/refund policy, amenities, parking, pets, and booking steps. ' +
    "Only refuse when the guest asks about other guests' bookings, owner revenue/expenses/profit, or internal operations — then politely decline and offer to loop in the host team. " +
    'Do not invent facts missing from Known facts and Quick reply snippets.';
  const basePrompt =
    `You are a friendly property rental host assistant for ${orgName}. ` +
    "Reply in complete sentences (1–3 short sentences). Answer the guest's latest question directly. " +
    'Use a warm Filipino-English tone when the guest writes in Taglish. ' +
    'For "available today" or "available tonight", use the Today / Check-in today lines in Known facts. ' +
    'Share payment account name and number when listed under Payment methods — guests need this to pay. ' +
    'Share the full address and map link when listed — guests need this for navigation.';

  // Org "Manage AI response" instructions layer on top of the base behavior — never replace it —
  // so Known facts, quick replies, and the safety policy always still apply.
  const override = input.systemPromptOverride?.trim();
  const customInstructions = override ? `\n\nHost's additional instructions: ${override}` : '';
  const systemPrompt = `${basePrompt}${customInstructions}\n\n${safetyPolicy}`;
  const grounding = await buildAiGroundingFacts(input.orgId, input.propertyId ?? null, {
    participantName: input.participantName,
    inquiryCheckIn: input.inquiryCheckIn ?? null,
    inquiryCheckOut: input.inquiryCheckOut ?? null,
    platform: input.platform,
  });
  const chronMessages = [...input.messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const transcript = chronMessages
    .slice(-12)
    .map((m) => {
      const who = m.direction === 'inbound' ? (input.participantName ?? 'Guest') : 'Host';
      return `${who}: ${m.body?.trim() || '(attachment)'}`;
    })
    .join('\n');
  const lastGuest = [...chronMessages].reverse().find((m) => m.direction === 'inbound');
  const latestGuestText = lastGuest?.body?.trim() || '(attachment)';

  const contextLines = [`Platform: ${input.platform}`, `Type: ${input.conversationType}`];
  if (input.propertyName) contextLines.push(`Property: ${input.propertyName}`);
  if (input.inquiryCheckIn && input.inquiryCheckOut) {
    contextLines.push(`Inquiry dates: ${input.inquiryCheckIn} to ${input.inquiryCheckOut}`);
  }

  const userPrompt =
    `Known facts (property/booking data + quick reply snippets):\n${grounding.factsText}\n\n` +
    `${contextLines.join('\n')}\n\n` +
    `Conversation:\n${transcript}\n\n` +
    `Reply to the guest's latest message: "${latestGuestText}"\n` +
    'Write only the reply text — no quotes, labels, or markdown.';

  const cacheKey = await computePromptFingerprint(buildCacheInputs(systemPrompt, userPrompt));
  const cached = await getCachedAiResponse(feature, cacheKey);
  if (cached) {
    return { suggestion: cached.responseText, flagged: false };
  }

  const errors: string[] = [];
  let draft: string | null = null;
  let usageRecord: RecordAiUsageInput | null = null;
  const usageBase = {
    organizationId: input.orgId,
    propertyId: input.propertyId ?? null,
    feature,
  };

  if (getGeminiApiKeys().length) {
    try {
      const result = await tryGeminiReply(systemPrompt, userPrompt, usageBase);
      if (result) {
        draft = result.text;
        usageRecord = result.usage;
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (!draft && getGroqApiKey()) {
    try {
      const result = await tryGroqReply(systemPrompt, userPrompt, usageBase);
      if (result) {
        draft = result.text;
        usageRecord = result.usage;
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (!draft) {
    if (!getGeminiApiKeys().length && !getGroqApiKey()) {
      throw new Error('AI suggestion unavailable — set GEMINI_API_KEYS or GROQ_API_KEY');
    }
    throw new Error(`AI suggestion unavailable — ${errors.join('; ')}`);
  }

  if (usageRecord) {
    await recordAiUsage(usageRecord);
  }

  const guard = assertSafeGuestReply({
    draftText: draft,
    guestMessage: latestGuestText,
    allowedFacts: {
      pricingValues: grounding.guardContext.pricingValues,
      allowedAccountNumbers: grounding.guardContext.allowedAccountNumbers,
    },
    participantName: input.participantName,
    otherGuestNames: grounding.guardContext.otherGuestNames,
  });

  if (!guard.safe) {
    console.warn('[socialInboxAiService] reply flagged:', guard.reason);
    return { suggestion: AI_SUGGEST_FALLBACK_REPLY, flagged: true };
  }

  if (usageRecord) {
    await setCachedAiResponse(feature, cacheKey, {
      provider: usageRecord.provider,
      model: usageRecord.model,
      responseText: draft,
      inputTokens: usageRecord.inputTokens ?? 0,
      outputTokens: usageRecord.outputTokens ?? 0,
      estimatedCostUsd: 0,
    });
  }
  return { suggestion: draft, flagged: false };
}

export function isWithinMessagingWindow(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function isWithinMessagingWindowFromInbound(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  const expires = new Date(lastInboundAt);
  expires.setHours(expires.getHours() + 24);
  return expires.getTime() > Date.now();
}
