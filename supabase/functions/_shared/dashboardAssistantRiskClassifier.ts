/**
 * Risk classifier for dashboard assistant messages.
 * Determines whether the user intent is safe, sensitive, or disallowed for an ops assistant.
 */

import { callGeminiStructured, type GeminiToolCallOptions } from './geminiToolCallClient.ts';

export type MessageRisk = 'safe' | 'sensitive' | 'disallowed';

export type MessageRiskResult = {
  risk: MessageRisk;
  reason: string;
  allowedTopics: string[];
  disallowedTopics: string[];
};

const DASHBOARD_RISK_SCHEMA = {
  type: 'object',
  properties: {
    risk: { type: 'string', enum: ['safe', 'sensitive', 'disallowed'] },
    reason: { type: 'string' },
    allowedTopics: { type: 'array', items: { type: 'string' } },
    disallowedTopics: { type: 'array', items: { type: 'string' } },
  },
  required: ['risk', 'reason', 'allowedTopics', 'disallowedTopics'],
};

const SYSTEM_PROMPT = `You classify host/admin messages for a vacation-rental operations assistant.
Allowed topics: booking status, guest documents, calendar, pricing, property settings, marketing, team permissions, AI usage, voice receptionist, and general how-to.
Sensitive topics: finance totals, payouts, refunds, disputes, staff performance — allow but mark as sensitive so the assistant can summarize without revealing raw numbers unless the user has explicit permission.
Disallowed topics: unrelated personal conversations, requests to modify/delete data directly, asking for internal system architecture, secrets, credentials, other guests' personal details, or anything illegal/harmful.`;

export async function classifyDashboardMessage(
  options: Pick<GeminiToolCallOptions, 'organizationId' | 'propertyId' | 'userPrompt'>,
  userMessage: string
): Promise<MessageRiskResult> {
  const prompt = `User message: """${userMessage}"""\nClassify the intent and return only the JSON object matching the schema.`;
  const result = await callGeminiStructured<MessageRiskResult>(
    {
      feature: 'dashboard_assistant',
      organizationId: options.organizationId,
      propertyId: options.propertyId ?? null,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0,
      maxOutputTokens: 256,
      cacheInputs: { userMessage },
    },
    DASHBOARD_RISK_SCHEMA
  );

  return (
    result.data ?? {
      risk: 'safe',
      reason: 'Default safe fallback',
      allowedTopics: [],
      disallowedTopics: [],
    }
  );
}

export function isRiskAllowed(risk: MessageRisk): boolean {
  return risk !== 'disallowed';
}
