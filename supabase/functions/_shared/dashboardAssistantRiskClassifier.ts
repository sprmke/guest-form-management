/**
 * Risk classifiers for the AI dashboard assistant.
 * Two independent concerns, both server-side and deterministic where it matters:
 *   1. Message-intent classification (safe/sensitive/disallowed) — model-assisted, best-effort.
 *   2. Action-intent tiering (tier0/tier1/tier2) — the actual safety mechanism. Never asks the
 *      model; reads the same statusMachine.ts graph the orchestrator itself enforces, per
 *      docs/workflow/planned/ai-dashboard-assistant.md §5. A wrong tier here is the one bug
 *      class that must not exist — see the exhaustive-walk requirement in the plan's phase 6.
 */

import { callGeminiStructured, type GeminiToolCallOptions } from './geminiToolCallClient.ts';
import { canTransition, isBookingStatus, type BookingStatus } from './statusMachine.ts';

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

// ─── Action-intent risk tiering (deterministic, tool-execution safety gate) ──

export type ActionRiskTier = 'tier0_read' | 'tier1_auto' | 'tier2_confirmed';

/** Read-only tools — always tier0, never touch WorkflowOrchestrator. */
export const READ_TOOL_NAMES = new Set([
  'search_knowledge_base',
  'explain_booking_status',
  'get_booking',
  'list_bookings',
  'get_available_transitions',
  'get_dashboard_stats',
  'get_finance_summary',
  'list_finance_bookings',
  'get_maintenance_summary',
  'list_maintenance_items',
]);

/** Idempotent write tools with no status/financial change — tier1 by construction. */
export const TIER1_ONLY_TOOL_NAMES = new Set([
  'sync_booking_integrations',
  'run_receipt_validation',
]);

/** Always tier2, regardless of payload — destructive by definition. */
export const TIER2_ONLY_TOOL_NAMES = new Set(['propose_cancel_booking']);

/**
 * `TransitionPayload` fields (workflowOrchestrator.ts) whose presence with a non-null,
 * non-undefined value always escalates a transition proposal to Tier 2 — pricing/refund/
 * settlement fields are financially consequential even on an otherwise-forward, non-override edge.
 */
export const FINANCIAL_PAYLOAD_FIELDS = new Set([
  'booking_rate',
  'down_payment',
  'security_deposit',
  'pet_fee',
  'parking_rate_guest',
  'guest_additional_fee',
  'parking_rate_paid',
  'sd_additional_expenses',
  'sd_additional_profits',
  'sd_refund_amount',
  'guest_balance_paid_amount',
]);

export type ActionRiskInput = {
  toolName: string;
  /** Only meaningful for propose_transition_booking. */
  fromStatus?: string | null;
  toStatus?: string | null;
  payload?: Record<string, unknown> | null;
  /** The booking/property this specific tool call targets. */
  targetBookingId?: string | null;
  targetPropertyId?: string | null;
  /** The route the chat panel was opened from/is currently viewing — see plan §1. */
  pageContext?: { bookingId?: string | null; propertyId?: string | null } | null;
  /** True when the model requested more than one write tool call in this turn. */
  isBulk?: boolean;
};

function hasFinancialPayloadValue(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return false;
  for (const field of FINANCIAL_PAYLOAD_FIELDS) {
    const value = payload[field];
    if (value !== undefined && value !== null) return true;
  }
  return false;
}

function isCrossScope(input: ActionRiskInput): boolean {
  const ctx = input.pageContext;
  if (!ctx) return false;
  if (ctx.bookingId && input.targetBookingId && ctx.bookingId !== input.targetBookingId) {
    return true;
  }
  if (ctx.propertyId && input.targetPropertyId && ctx.propertyId !== input.targetPropertyId) {
    return true;
  }
  return false;
}

/**
 * Deterministic tier classifier — reads statusMachine.ts's canTransition() (never the model,
 * never a stored/asserted value) as the source of truth for "is this a plain forward edge or
 * a manual-override edge". Highest-tier rule wins. Must be called both at proposal time and
 * again, independently, immediately before execution (dashboardAssistantSafetyGuard.ts).
 */
export function classifyActionRisk(input: ActionRiskInput): ActionRiskTier {
  if (READ_TOOL_NAMES.has(input.toolName)) return 'tier0_read';
  if (TIER2_ONLY_TOOL_NAMES.has(input.toolName)) return 'tier2_confirmed';

  if (input.isBulk) return 'tier2_confirmed';
  if (isCrossScope(input)) return 'tier2_confirmed';

  if (TIER1_ONLY_TOOL_NAMES.has(input.toolName)) return 'tier1_auto';

  if (input.toolName === 'propose_transition_booking') {
    const from = input.fromStatus ?? '';
    const to = input.toStatus ?? '';
    if (!isBookingStatus(from) || !isBookingStatus(to)) return 'tier2_confirmed';

    const isPrimaryGraphEdge = canTransition(from as BookingStatus, to as BookingStatus, {
      manual: false,
    });
    if (!isPrimaryGraphEdge) return 'tier2_confirmed'; // manual-override-only edge
    if (to === 'CANCELLED') return 'tier2_confirmed';
    if (from === 'PENDING_SD_REFUND' && to === 'COMPLETED') return 'tier2_confirmed'; // refund finalization
    if (hasFinancialPayloadValue(input.payload)) return 'tier2_confirmed';

    return 'tier1_auto';
  }

  // Unknown/uncatalogued write tool — the executor's tool-catalog check should already have
  // hard-blocked this before classification is ever reached; tier2 is the safe fallback.
  return 'tier2_confirmed';
}
