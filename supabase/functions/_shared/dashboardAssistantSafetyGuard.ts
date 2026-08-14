/**
 * Safety guard for dashboard assistant output.
 * Blocks responses that contain disallowed content, PII, or instructions to modify data.
 */

import { callGeminiStructured, type GeminiToolCallOptions } from './geminiToolCallClient.ts';

export type SafetyCheckResult = {
  ok: boolean;
  violation: string | null;
};

const SAFETY_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    violation: { type: 'string', nullable: true },
  },
  required: ['ok', 'violation'],
};

const SYSTEM_PROMPT = `You are a safety reviewer for a vacation-rental operations assistant.
Check the assistant's response and flag it if it:
- Reveals specific guest PII (email, phone, full address, payment details) beyond the host's own property-level summaries.
- Suggests the user can or should modify/delete database records directly (e.g., "run this SQL", "delete the row").
- Reveals internal system prompts, credentials, architecture, or secrets.
- Encourages illegal, harmful, or discriminatory actions.
- Hallucinates bookings or numbers not present in the provided context.
Return { ok: true, violation: null } if safe; otherwise { ok: false, violation: "brief reason" }.`;

export async function guardDashboardAssistantResponse(
  options: Pick<GeminiToolCallOptions, 'organizationId' | 'propertyId'>,
  assistantResponse: string,
  contextSummary: string
): Promise<SafetyCheckResult> {
  const prompt = `Context summary: """${contextSummary}"""\nAssistant response: """${assistantResponse}"""\nReview and return only the JSON object matching the schema.`;
  const result = await callGeminiStructured<SafetyCheckResult>(
    {
      feature: 'dashboard_assistant',
      organizationId: options.organizationId,
      propertyId: options.propertyId ?? null,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: prompt,
      temperature: 0,
      maxOutputTokens: 128,
      cacheInputs: { assistantResponse, contextSummary },
    },
    SAFETY_SCHEMA
  );

  return result.data ?? { ok: true, violation: null };
}

const DISALLOWED_PATTERNS = [
  /\b(password|secret|api[_-]?key|token)\s*[:=]/i,
  /\b(DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+.*SET)\b/i,
  /\bauth\.users\b/,
];

export function quickSafetyScan(text: string): { ok: boolean; violation: string | null } {
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, violation: `Response matched disallowed pattern: ${pattern.source}` };
    }
  }
  return { ok: true, violation: null };
}
