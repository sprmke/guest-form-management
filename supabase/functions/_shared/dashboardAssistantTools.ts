/**
 * Fixed tool catalog for the AI dashboard assistant (docs/workflow/planned/ai-dashboard-assistant.md §2).
 *
 * Defense-in-depth by construction: every tool independently re-derives the required permission
 * and re-runs the RBAC primitive (`verifyPropertyAccess`/`verifyOrgAccess`) against the ORIGINAL
 * request's JWT — never anything the model asserts (arguments are untrusted input). Write tools
 * additionally re-derive the risk tier via `classifyActionRisk()`/`assertActionSafeToExecute()`
 * immediately before executing, and Tier-2 actions are never executed inline — they return a
 * `proposed` result for the caller (`dashboard-assistant-chat`) to persist as a pending action.
 *
 * `sync_booking_integrations` from the plan's original catalog is intentionally omitted: this
 * repo has no Google Calendar/Sheets re-sync endpoint or service to wrap (confirmed by grep —
 * `sync-booking-integrations`/`backfill-calendar-event-dates` are empty stub directories with no
 * `index.ts`). Do not add a fake tool for functionality that doesn't exist.
 */

import { DatabaseService } from './databaseService.ts';
import { computeDashboardStats } from './dashboardService.ts';
import { computeFinanceSummary, listFinanceBookings } from './financeService.ts';
import { computeMaintenanceSummary, listMaintenanceItems } from './maintenanceService.ts';
import {
  backfillMissingReceiptAiVerdicts,
  dbPatchFromReceiptBackfillItems,
} from './receiptValidationService.ts';
import { computeTotalGuestBalanceFromBooking } from './totalGuestBalance.ts';
import { createServiceClient, verifyOrgAccess, verifyPropertyAccess } from './orgAuth.ts';
import { listPropertyIdsForOrganization } from './propertyScope.ts';
import {
  availableTransitions,
  isBookingStatus,
  STATUS_HUMAN_LABEL,
  type BookingStatus,
} from './statusMachine.ts';
import { WorkflowOrchestrator } from './workflowOrchestrator.ts';
import {
  classifyActionRisk,
  READ_TOOL_NAMES,
  TIER1_ONLY_TOOL_NAMES,
  TIER2_ONLY_TOOL_NAMES,
  type ActionRiskTier,
} from './dashboardAssistantRiskClassifier.ts';
import { assertActionSafeToExecute } from './dashboardAssistantSafetyGuard.ts';

export type ToolExecutionContext = {
  req: Request;
  organizationId: string;
  userId: string;
  pageContext: { propertyId?: string | null; bookingId?: string | null };
  /** True when the model requested more than one write tool call this turn — forces Tier 2. */
  isBulk: boolean;
};

export type ToolResult = {
  ok: boolean;
  error?: string;
  data?: unknown;
  /** Only set for tools in the write catalog. */
  riskTier?: ActionRiskTier;
  /** True when a Tier-2 write tool returned a proposal rather than executing. */
  proposed?: boolean;
  auditPropertyId?: string | null;
  auditBookingId?: string | null;
};

const ALL_TOOL_NAMES = new Set([
  ...READ_TOOL_NAMES,
  ...TIER1_ONLY_TOOL_NAMES,
  ...TIER2_ONLY_TOOL_NAMES,
  'propose_transition_booking',
]);

export function isKnownTool(toolName: string): boolean {
  return ALL_TOOL_NAMES.has(toolName);
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Resolves + RBAC-verifies the property a tool call targets — explicit arg, else pageContext. */
async function resolveTargetProperty(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
  requiredPermission: Parameters<typeof verifyPropertyAccess>[2]
): Promise<{ propertyId: string; orgId: string }> {
  const propertyId = str(args, 'propertyId') ?? ctx.pageContext.propertyId ?? undefined;
  if (!propertyId) {
    throw new Error('propertyId is required (no property in scope)');
  }
  const access = await verifyPropertyAccess(ctx.req, propertyId, requiredPermission);
  return { propertyId: access.property.id, orgId: access.org.id };
}

/** Resolves the property a bookingId belongs to and RBAC-verifies it, org-wide. */
async function resolveBookingProperty(
  ctx: ToolExecutionContext,
  bookingId: string,
  requiredPermission: Parameters<typeof verifyPropertyAccess>[2]
): Promise<string> {
  const sb = createServiceClient();
  const { data: row, error } = await sb
    .from('guest_submissions')
    .select('property_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !row) throw new Error(`Booking not found: ${bookingId}`);
  const propertyId = row.property_id as string;
  await verifyPropertyAccess(ctx.req, propertyId, requiredPermission);
  return propertyId;
}

// ─── Read tools (Tier 0, always allowed) ─────────────────────────────────────

async function toolSearchKnowledgeBase(args: Record<string, unknown>): Promise<ToolResult> {
  const query = str(args, 'query');
  if (!query) return { ok: false, error: 'query is required' };
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('ai_dashboard_assistant_knowledge_base')
    .select('question, answer, route_path')
    .or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
    .limit(5);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

function toolExplainBookingStatus(args: Record<string, unknown>): ToolResult {
  const status = str(args, 'status');
  if (!status || !isBookingStatus(status)) {
    return { ok: false, error: `Unknown status: ${status ?? ''}` };
  }
  const nextOptions = availableTransitions(status, { manual: true });
  return {
    ok: true,
    data: {
      status,
      label: STATUS_HUMAN_LABEL[status],
      nextOptions: nextOptions.map((s) => ({ status: s, label: STATUS_HUMAN_LABEL[s] })),
    },
  };
}

async function toolGetBooking(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const bookingId = str(args, 'bookingId');
  if (!bookingId) return { ok: false, error: 'bookingId is required' };
  const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:view');

  const sb = createServiceClient();
  const [{ data: booking }, { data: property }] = await Promise.all([
    sb.from('guest_submissions').select('*').eq('id', bookingId).maybeSingle(),
    sb.from('properties').select('id, name').eq('id', propertyId).maybeSingle(),
  ]);
  if (!booking) return { ok: false, error: 'Booking not found' };

  const totalDue = computeTotalGuestBalanceFromBooking(booking as Record<string, unknown>);
  const balanceDue = totalDue === null ? null : totalDue - num(booking.guest_balance_paid_amount);

  return {
    ok: true,
    auditPropertyId: propertyId,
    auditBookingId: bookingId,
    data: {
      bookingId: booking.id,
      guestName: booking.primary_guest_name ?? '',
      status: booking.status,
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      propertyId,
      propertyName: property?.name ?? '',
      balanceDue,
    },
  };
}

async function toolListBookings(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const explicitPropertyId = str(args, 'propertyId') ?? ctx.pageContext.propertyId ?? undefined;
  const status = Array.isArray(args.status)
    ? (args.status as string[]).filter(isBookingStatus)
    : undefined;

  let propertyIds: string[] | undefined;
  if (explicitPropertyId) {
    const access = await verifyPropertyAccess(ctx.req, explicitPropertyId, 'bookings:view');
    propertyIds = [access.property.id];
  } else {
    const access = await verifyOrgAccess(
      ctx.req,
      { orgId: ctx.organizationId },
      'org:bookings:view'
    );
    propertyIds = await listPropertyIdsForOrganization(access.org.id);
  }

  const result = await DatabaseService.listBookings({
    propertyIds,
    status,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
    page: 1,
    limit: 10,
    sort: 'check_in_date:asc',
  });

  return { ok: true, data: result };
}

async function toolGetAvailableTransitions(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const bookingId = str(args, 'bookingId');
  if (!bookingId) return { ok: false, error: 'bookingId is required' };
  await resolveBookingProperty(ctx, bookingId, 'bookings:view');

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) return { ok: false, error: 'Booking not found' };
  const status = booking.status as string;
  if (!isBookingStatus(status)) return { ok: false, error: `Unrecognized status: ${status}` };

  const options = availableTransitions(status, { manual: true });
  return {
    ok: true,
    data: {
      bookingId,
      currentStatus: status,
      options: options.map((s) => ({ status: s, label: STATUS_HUMAN_LABEL[s] })),
    },
  };
}

async function toolGetDashboardStats(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const explicitPropertyId = str(args, 'propertyId') ?? ctx.pageContext.propertyId ?? undefined;
  let propertyId: string | undefined;
  let orgId: string | undefined;
  if (explicitPropertyId) {
    const access = await verifyPropertyAccess(ctx.req, explicitPropertyId, 'bookings:view');
    propertyId = access.property.id;
  } else {
    const access = await verifyOrgAccess(
      ctx.req,
      { orgId: ctx.organizationId },
      'org:dashboard:view'
    );
    orgId = access.org.id;
  }
  const data = await computeDashboardStats({
    propertyId,
    orgId,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
  });
  return { ok: true, data };
}

async function toolGetFinanceSummary(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { propertyId } = await resolveTargetProperty(ctx, args, 'finance:view');
  const data = await computeFinanceSummary({
    propertyId,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
    basis: 'checkout',
    includeCancelled: false,
    completedOnly: false,
  });
  return { ok: true, data };
}

async function toolListFinanceBookings(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { propertyId } = await resolveTargetProperty(ctx, args, 'finance:view');
  const { rows, total } = await listFinanceBookings({
    propertyId,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
    basis: 'checkout',
    includeCancelled: false,
    completedOnly: false,
    page: 1,
    limit: 10,
    sort: 'check_in_date:desc',
  });
  return { ok: true, data: { rows, total } };
}

async function toolGetMaintenanceSummary(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { propertyId } = await resolveTargetProperty(ctx, args, 'maintenance:view');
  const data = await computeMaintenanceSummary({
    propertyId,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
  });
  return { ok: true, data };
}

async function toolListMaintenanceItems(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { propertyId } = await resolveTargetProperty(ctx, args, 'maintenance:view');
  const items = await listMaintenanceItems({
    propertyId,
    from: str(args, 'from') ?? null,
    to: str(args, 'to') ?? null,
  });
  return { ok: true, data: items.slice(0, 10) };
}

// ─── Write tools (Tier 1 auto or Tier 2 confirmed — never trust the model's tier) ────────────

async function toolRunReceiptValidation(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const bookingId = str(args, 'bookingId');
  if (!bookingId) return { ok: false, error: 'bookingId is required' };
  const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:edit');

  const tier = classifyActionRisk({
    toolName: 'run_receipt_validation',
    targetBookingId: bookingId,
    targetPropertyId: propertyId,
    pageContext: ctx.pageContext,
    isBulk: ctx.isBulk,
  });
  if (tier === 'tier2_confirmed') {
    return {
      ok: true,
      proposed: true,
      riskTier: tier,
      auditPropertyId: propertyId,
      auditBookingId: bookingId,
      data: { bookingId, summary: 'Re-run AI receipt validation for this booking.' },
    };
  }

  await assertActionSafeToExecute({
    toolName: 'run_receipt_validation',
    targetBookingId: bookingId,
    targetPropertyId: propertyId,
    pageContext: ctx.pageContext,
    isBulk: ctx.isBulk,
    expectedTier: tier,
  });

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) return { ok: false, error: 'Booking not found' };
  const access = await verifyPropertyAccess(ctx.req, propertyId, 'bookings:edit');
  const { validated, errors } = await backfillMissingReceiptAiVerdicts(
    booking as Record<string, unknown>,
    {
      organizationId: access.org.id,
      propertyId,
    }
  );
  if (validated.length > 0) {
    await DatabaseService.setWorkflowFields(bookingId, dbPatchFromReceiptBackfillItems(validated));
  }

  return {
    ok: true,
    riskTier: tier,
    auditPropertyId: propertyId,
    auditBookingId: bookingId,
    data: { bookingId, validatedCount: validated.length, errors },
  };
}

async function toolProposeTransitionBooking(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const bookingId = str(args, 'bookingId');
  const toStatus = str(args, 'toStatus');
  if (!bookingId || !toStatus || !isBookingStatus(toStatus)) {
    return { ok: false, error: 'bookingId and a valid toStatus are required' };
  }
  const payload = (args.payload && typeof args.payload === 'object' ? args.payload : {}) as Record<
    string,
    unknown
  >;
  const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:workflow');

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) return { ok: false, error: 'Booking not found' };
  const fromStatus = booking.status as string;

  const tier = classifyActionRisk({
    toolName: 'propose_transition_booking',
    fromStatus,
    toStatus,
    payload,
    targetBookingId: bookingId,
    targetPropertyId: propertyId,
    pageContext: ctx.pageContext,
    isBulk: ctx.isBulk,
  });

  if (tier === 'tier2_confirmed') {
    return {
      ok: true,
      proposed: true,
      riskTier: tier,
      auditPropertyId: propertyId,
      auditBookingId: bookingId,
      data: {
        bookingId,
        toStatus,
        payload,
        summary: `Move booking to ${STATUS_HUMAN_LABEL[toStatus as BookingStatus]}.`,
      },
    };
  }

  await assertActionSafeToExecute({
    toolName: 'propose_transition_booking',
    toStatus,
    payload,
    targetBookingId: bookingId,
    targetPropertyId: propertyId,
    pageContext: ctx.pageContext,
    isBulk: ctx.isBulk,
    expectedTier: tier,
  });

  const result = await WorkflowOrchestrator.transition(bookingId, toStatus, payload, {}, true);

  return {
    ok: true,
    riskTier: tier,
    auditPropertyId: propertyId,
    auditBookingId: bookingId,
    data: result,
  };
}

async function toolProposeCancelBooking(
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const bookingId = str(args, 'bookingId');
  if (!bookingId) return { ok: false, error: 'bookingId is required' };
  const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:workflow');

  // Always Tier 2 — TIER2_ONLY_TOOL_NAMES short-circuits classifyActionRisk before any edge check.
  const tier = classifyActionRisk({
    toolName: 'propose_cancel_booking',
    targetBookingId: bookingId,
    targetPropertyId: propertyId,
    pageContext: ctx.pageContext,
    isBulk: ctx.isBulk,
  });

  return {
    ok: true,
    proposed: true,
    riskTier: tier,
    auditPropertyId: propertyId,
    auditBookingId: bookingId,
    data: { bookingId, toStatus: 'CANCELLED', summary: 'Cancel this booking.' },
  };
}

/** Executes a Tier-2 proposal that was already confirmed — called only from dashboard-assistant-confirm. */
export async function executeConfirmedAction(
  toolName: string,
  inputPayload: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  if (toolName === 'propose_cancel_booking') {
    const bookingId = str(inputPayload, 'bookingId');
    if (!bookingId) return { ok: false, error: 'bookingId is required' };
    const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:workflow');

    await assertActionSafeToExecute({
      toolName: 'propose_cancel_booking',
      targetBookingId: bookingId,
      targetPropertyId: propertyId,
      pageContext: ctx.pageContext,
      isBulk: false,
      expectedTier: 'tier2_confirmed',
    });

    const result = await WorkflowOrchestrator.transition(bookingId, 'CANCELLED', {}, {}, true);
    return {
      ok: true,
      riskTier: 'tier2_confirmed',
      auditPropertyId: propertyId,
      auditBookingId: bookingId,
      data: result,
    };
  }

  if (toolName === 'propose_transition_booking') {
    const bookingId = str(inputPayload, 'bookingId');
    const toStatus = str(inputPayload, 'toStatus');
    if (!bookingId || !toStatus || !isBookingStatus(toStatus)) {
      return { ok: false, error: 'bookingId and a valid toStatus are required' };
    }
    const payload = (
      inputPayload.payload && typeof inputPayload.payload === 'object' ? inputPayload.payload : {}
    ) as Record<string, unknown>;
    const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:workflow');

    await assertActionSafeToExecute({
      toolName: 'propose_transition_booking',
      toStatus,
      payload,
      targetBookingId: bookingId,
      targetPropertyId: propertyId,
      pageContext: ctx.pageContext,
      isBulk: false,
      expectedTier: 'tier2_confirmed',
    });

    const result = await WorkflowOrchestrator.transition(bookingId, toStatus, payload, {}, true);
    return {
      ok: true,
      riskTier: 'tier2_confirmed',
      auditPropertyId: propertyId,
      auditBookingId: bookingId,
      data: result,
    };
  }

  if (toolName === 'run_receipt_validation') {
    const bookingId = str(inputPayload, 'bookingId');
    if (!bookingId) return { ok: false, error: 'bookingId is required' };
    const propertyId = await resolveBookingProperty(ctx, bookingId, 'bookings:edit');

    await assertActionSafeToExecute({
      toolName: 'run_receipt_validation',
      targetBookingId: bookingId,
      targetPropertyId: propertyId,
      pageContext: ctx.pageContext,
      isBulk: false,
      expectedTier: 'tier2_confirmed',
    });

    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };
    const access = await verifyPropertyAccess(ctx.req, propertyId, 'bookings:edit');
    const { validated, errors } = await backfillMissingReceiptAiVerdicts(
      booking as Record<string, unknown>,
      {
        organizationId: access.org.id,
        propertyId,
      }
    );
    if (validated.length > 0) {
      await DatabaseService.setWorkflowFields(
        bookingId,
        dbPatchFromReceiptBackfillItems(validated)
      );
    }
    return {
      ok: true,
      riskTier: 'tier2_confirmed',
      auditPropertyId: propertyId,
      auditBookingId: bookingId,
      data: { bookingId, validatedCount: validated.length, errors },
    };
  }

  return { ok: false, error: `Unknown or non-confirmable tool: ${toolName}` };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  if (!isKnownTool(toolName)) {
    return { ok: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    switch (toolName) {
      case 'search_knowledge_base':
        return await toolSearchKnowledgeBase(args);
      case 'explain_booking_status':
        return toolExplainBookingStatus(args);
      case 'get_booking':
        return await toolGetBooking(ctx, args);
      case 'list_bookings':
        return await toolListBookings(ctx, args);
      case 'get_available_transitions':
        return await toolGetAvailableTransitions(ctx, args);
      case 'get_dashboard_stats':
        return await toolGetDashboardStats(ctx, args);
      case 'get_finance_summary':
        return await toolGetFinanceSummary(ctx, args);
      case 'list_finance_bookings':
        return await toolListFinanceBookings(ctx, args);
      case 'get_maintenance_summary':
        return await toolGetMaintenanceSummary(ctx, args);
      case 'list_maintenance_items':
        return await toolListMaintenanceItems(ctx, args);
      case 'run_receipt_validation':
        return await toolRunReceiptValidation(ctx, args);
      case 'propose_transition_booking':
        return await toolProposeTransitionBooking(ctx, args);
      case 'propose_cancel_booking':
        return await toolProposeCancelBooking(ctx, args);
      default:
        return { ok: false, error: `Unhandled tool: ${toolName}` };
    }
  } catch (err) {
    // A permission re-check failure (verifyPropertyAccess/verifyOrgAccess throwing a Response)
    // or any other tool error surfaces as a plain refusal — never a confirmation prompt.
    if (err instanceof Response) {
      return { ok: false, error: 'Access restricted for this action.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Gemini function declarations ────────────────────────────────────────────

export const TOOL_DECLARATIONS = [
  {
    name: 'search_knowledge_base',
    description: 'Search the host-facing knowledge base for "how does X work" questions.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'explain_booking_status',
    description: 'Explain what a booking status means and what unblocks the next step.',
    parameters: {
      type: 'object',
      properties: { status: { type: 'string' } },
      required: ['status'],
    },
  },
  {
    name: 'get_booking',
    description: 'Fetch a single booking by id.',
    parameters: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
  {
    name: 'list_bookings',
    description: 'List bookings, optionally filtered by property, status, or date range.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        status: { type: 'array', items: { type: 'string' } },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'get_available_transitions',
    description: 'List the statuses a booking can currently move to.',
    parameters: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
  {
    name: 'get_dashboard_stats',
    description:
      'Get aggregate dashboard stats (check-ins, check-outs, occupancy) for a property or org.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'get_finance_summary',
    description: 'Get finance KPI summary (income, expenses, net) for a property.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'list_finance_bookings',
    description: 'List bookings with finance figures for a property.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'get_maintenance_summary',
    description: 'Get maintenance KPI summary for a property.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'list_maintenance_items',
    description: 'List maintenance items for a property.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'run_receipt_validation',
    description:
      "Re-run AI validation on a booking's payment receipts (idempotent, no financial change).",
    parameters: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
  {
    name: 'propose_transition_booking',
    description:
      'Move a booking to a new status. Financially-sensitive or override transitions require host confirmation.',
    parameters: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        toStatus: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['bookingId', 'toStatus'],
    },
  },
  {
    name: 'propose_cancel_booking',
    description: 'Cancel a booking. Always requires host confirmation.',
    parameters: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
];
