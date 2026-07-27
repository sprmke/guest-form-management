/**
 * AI reply suggestions for social inbox — Gemini/Groq with org context.
 */

import { createServiceClient } from './orgAuth.ts';
import { buildAiGroundingFacts } from './inboxAiGuestContext.ts';
import { AI_SUGGEST_FALLBACK_REPLY, assertSafeGuestReply } from './inboxAiSafetyGuard.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
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

function providerError(json: unknown, fallback: string): string {
  const err = json as { error?: { message?: string; code?: string | number } };
  const message = err.error?.message?.trim();
  if (message) return message;
  return fallback;
}

async function tryGeminiReply(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const keys = geminiKeys();
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
            maxOutputTokens: 512,
            // Gemini 2.5 Flash thinks by default; thinking tokens share maxOutputTokens
            // and can truncate guest-visible replies mid-sentence.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        lastError = providerError(json, `HTTP ${res.status}`);
        continue;
      }
      const text = extractGeminiText(json);
      if (text) return text;
      lastError = 'Empty Gemini response';
    } catch (e) {
      lastError = (e as Error).message;
    }
  }

  throw new Error(`Gemini: ${lastError}`);
}

async function tryGroqReply(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const key = groqKey();
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
      max_tokens: 512,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Groq: ${providerError(json, `HTTP ${res.status}`)}`);
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (text) return text;
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
  const geminiConfigured = geminiKeys().length > 0;
  const groqConfigured = !!groqKey();
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
      const text = await tryGeminiReply(probeSystem, probeUser);
      if (text) {
        return { available: true, geminiConfigured, groqConfigured, error: null };
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (groqConfigured) {
    try {
      const text = await tryGroqReply(probeSystem, probeUser);
      if (text) {
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

  const errors: string[] = [];
  let draft: string | null = null;

  if (geminiKeys().length) {
    try {
      draft = await tryGeminiReply(systemPrompt, userPrompt);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (!draft && groqKey()) {
    try {
      draft = await tryGroqReply(systemPrompt, userPrompt);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (!draft) {
    if (!geminiKeys().length && !groqKey()) {
      throw new Error('AI suggestion unavailable — set GEMINI_API_KEYS or GROQ_API_KEY');
    }
    throw new Error(`AI suggestion unavailable — ${errors.join('; ')}`);
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
