/**
 * dashboard-assistant-chat — main AI dashboard assistant turn endpoint.
 * Docs: docs/workflow/planned/ai-dashboard-assistant.md §1 (turn flow), §2 (tools), §5 (guardrails).
 *
 * Body: { conversationId?, orgSlug, pageContext: { propertyId?, bookingId? }, attachedContext?: AttachedContextItem[], message, attachments?: [{ name, mimeType, dataBase64 }] }
 *
 * Tier-2 actions are never executed here — a proposal short-circuits the tool loop and returns
 * an `action_confirmation` block with status "proposed"; dashboard-assistant-confirm executes it.
 */

import {
  attachedContextPromptLines,
  parseAttachedContextInput,
  verifyAttachedContextAccess,
  withAssistantScope,
} from '../_shared/dashboardAssistantAttachedContext.ts';
import {
  buildHostSafeGroundingFacts,
  hostSafeGroundingFactsToPrompt,
} from '../_shared/dashboardAssistantContext.ts';
import {
  checkDashboardAssistantQuota,
  getDashboardAssistantGlobalSettings,
  getDashboardAssistantOrgSettings,
  incrementDashboardAssistantUsage,
  isDashboardAssistantAccessible,
} from '../_shared/dashboardAssistantSettings.ts';
import {
  isExternalSendTool,
  TIER1_ONLY_TOOL_NAMES,
  TIER2_ONLY_TOOL_NAMES,
} from '../_shared/dashboardAssistantRiskClassifier.ts';
import { isAiPlatformDisabledError, isAiQuotaError } from '../_shared/aiUsageService.ts';
import {
  humanizeStatusCodesInText,
  hydrateAssistantBlocksFromTools,
  nestBookingJourneyStepper,
  sanitizeAssistantChatBlocks,
} from '../_shared/dashboardAssistantBlocks.ts';
import {
  assertBlocksGrounded,
  guardDashboardAssistantResponse,
  quickSafetyScan,
  type ChatBlock,
} from '../_shared/dashboardAssistantSafetyGuard.ts';
import {
  parseIncomingAttachments,
  persistAssistantAttachments,
} from '../_shared/dashboardAssistantAttachments.ts';
import {
  executeTool,
  TOOL_DECLARATIONS,
  type ToolExecutionContext,
  type ToolResult,
} from '../_shared/dashboardAssistantTools.ts';
import {
  callGeminiStructured,
  callGeminiToolCall,
  type GeminiContent,
} from '../_shared/geminiToolCallClient.ts';
import {
  handleEdgeError,
  jsonError,
  jsonResponse,
  jsonSuccess,
  jsonUpgradeHook,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  PlanFeatureRequiredError,
  requireOrgPropertyFeature,
  requirePropertyFeature,
} from '../_shared/planEntitlements.ts';
import { createServiceClient, verifyOrgAccess, verifyPropertyAccess } from '../_shared/orgAuth.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

const MAX_TOOL_ROUNDS = 4;
const WRITE_TOOL_NAMES = new Set([
  ...TIER1_ONLY_TOOL_NAMES,
  ...TIER2_ONLY_TOOL_NAMES,
  'propose_transition_booking',
]);

const BLOCKS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'text',
              'booking_card',
              'stat_list',
              'data_table',
              'link_list',
              'file_list',
              'image',
              'quick_actions',
            ],
          },
          text: { type: 'string' },
          bookingId: { type: 'string' },
          guestName: { type: 'string' },
          status: { type: 'string' },
          checkIn: { type: 'string' },
          checkOut: { type: 'string' },
          propertyName: { type: 'string' },
          balanceDue: { type: 'number', nullable: true },
          title: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, value: { type: 'string' } },
              required: ['label', 'value'],
            },
          },
          columns: { type: 'array', items: { type: 'string' } },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cells: { type: 'array', items: { type: 'string' } },
              },
              required: ['cells'],
            },
          },
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, href: { type: 'string' } },
              required: ['label', 'href'],
            },
          },
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                url: { type: 'string' },
                kind: { type: 'string', enum: ['image', 'pdf', 'file'] },
              },
              required: ['label', 'url'],
            },
          },
          url: { type: 'string' },
          alt: { type: 'string' },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, prompt: { type: 'string' } },
              required: ['label', 'prompt'],
            },
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['blocks'],
};

const SYSTEM_PROMPT_PREFIX = `You are the AI dashboard assistant for Kame Homes hosts. Answer only from the Known facts and tool results below — never invent booking data, amounts, or guest names. Never claim an action succeeded unless a tool call actually returned success. When you need live data, call a tool instead of guessing. Financially-sensitive, destructive, or override actions require host confirmation — you do not need to warn about this, the platform handles it. Respond with a short set of typed blocks (text/booking_card/stat_list/data_table/link_list/file_list/image/quick_actions) — never HTML or markdown tables.

Host-facing rules:
- Always use human status labels from tool results (statusLabel), never raw codes like READY_FOR_CHECKOUT.
- Never emit an empty stat_list, data_table, link_list, or file_list. If a list is empty, say so in a text block.
- For data_table, every row must include cells[] in the same order as columns. Example: columns ["Guest","Check-in","Check-out"], rows [{cells:["Jane","2026-08-19","2026-08-20"]}].
- Pending tasks and SD refund amounts come from get_booking (pendingTasks, sdRefundAmount) — copy those, do not invent an empty list.
- For booked or available dates, call get_available_dates and use bookedStays / availableRanges.
- When the host asks to see, provide, open, or show a booking file (approved GAF, pet form, receipt, ID, parking endorsement), call get_booking_documents (kinds: gaf/pet/receipt/id/parking) and emit a file_list using the exact url values from the tool. Never invent URLs. If documents is empty, say the file is not on this booking. Do not answer a file request with only a booking_card.
- For photos or design previews, emit an image block using the exact url from a tool result (never invent URLs).
- quick_actions are short follow-up chips: label + prompt only, no URLs. Tapping fills the host's message box; do not treat them as executed actions.
- When the host asks to guide them through a booking's remaining steps, call plan_booking_journey. Do not invent a stepper — the platform renders it from that tool.
- Scope: when pageContext.propertyId is set, answer for that property only unless the host clearly asks about another property or the whole organization. Prefer omitting propertyId on tools so the platform uses pageContext.
- Finance / profit questions: call get_finance_summary (defaults to this calendar month for the current property). Answer with (1) a short text block naming the property and date range, plus a one-line plain-language breakdown, and (2) a stat_list using display.* values (₱) for Total Income, Total Expenses, and Net Profit. Use netProfit — never "Grand Net", never raw unformatted numbers.`;

async function resolveEffectivePermissions(
  req: Request,
  accessKind: string,
  propertyId: string | null | undefined
): Promise<{ permissions: string[]; propertyId: string | null }> {
  if (accessKind === 'owner' || accessKind === 'platform_admin' || accessKind === 'org_admin') {
    return {
      permissions: [
        'bookings:view',
        'bookings:edit',
        'bookings:workflow',
        'finance:view',
        'maintenance:view',
      ],
      propertyId: propertyId ?? null,
    };
  }
  if (propertyId) {
    const access = await verifyPropertyAccess(req, propertyId);
    return { permissions: access.permissions, propertyId: access.property.id };
  }
  return { permissions: [], propertyId: null };
}

serveAuthenticated('dashboard-assistant-chat', async (req, user) => {
  try {
    requireHttpMethod(req, 'POST');
    const body = await readJsonBody(req);
    const orgSlug = String(body.orgSlug ?? '').trim();
    const message = String(body.message ?? '').trim();
    const conversationIdInput = body.conversationId ? String(body.conversationId).trim() : null;
    const incomingAttachments = parseIncomingAttachments(body.attachments);
    const pageContext = {
      propertyId: body.pageContext?.propertyId ? String(body.pageContext.propertyId) : null,
      bookingId: body.pageContext?.bookingId ? String(body.pageContext.bookingId) : null,
    };
    let attachedContext: Awaited<ReturnType<typeof verifyAttachedContextAccess>> = [];
    try {
      attachedContext = parseAttachedContextInput(body.attachedContext);
    } catch (err) {
      return jsonError(req, err instanceof Error ? err.message : 'Invalid attachedContext', 400);
    }

    if (!orgSlug) return jsonError(req, 'orgSlug is required', 400);
    if (!message && incomingAttachments.length === 0) {
      return jsonError(req, 'message or attachments required', 400);
    }

    const orgCtx = await verifyOrgAccess(req, { orgSlug });
    try {
      attachedContext = await verifyAttachedContextAccess(req, attachedContext);
    } catch (err) {
      return jsonError(
        req,
        err instanceof Error ? err.message : 'Cannot access attached context',
        403
      );
    }
    const { permissions, propertyId: effectivePropertyId } = await resolveEffectivePermissions(
      req,
      orgCtx.accessKind,
      pageContext.propertyId
    );

    const [globalSettings, orgSettings] = await Promise.all([
      getDashboardAssistantGlobalSettings(),
      getDashboardAssistantOrgSettings(orgCtx.org.id),
    ]);
    if (!isDashboardAssistantAccessible(globalSettings, orgSettings, pageContext.propertyId)) {
      return jsonError(req, 'AI dashboard assistant is not enabled for this organization', 503);
    }

    if (effectivePropertyId) {
      try {
        await requirePropertyFeature(effectivePropertyId, 'aiDashboardAssistant');
      } catch (err) {
        if (err instanceof PlanFeatureRequiredError) {
          return jsonUpgradeHook(req, err.message, { feature: err.feature });
        }
        throw err;
      }
    } else {
      try {
        await requireOrgPropertyFeature(orgCtx.org.id, 'aiDashboardAssistant');
      } catch (err) {
        if (err instanceof PlanFeatureRequiredError) {
          return jsonUpgradeHook(req, err.message, { feature: err.feature });
        }
        throw err;
      }
    }

    const quota = await checkDashboardAssistantQuota(orgCtx.org.id, orgSettings);
    if (!quota.allowed) {
      return jsonSuccess(req, {
        conversationId: conversationIdInput,
        blocks: [
          {
            type: 'text',
            text: `You've reached the ${quota.reason === 'daily_limit' ? 'daily' : 'monthly'} message limit for the AI assistant.`,
          },
        ],
        upgradeHook: true,
      });
    }

    const sb = createServiceClient();

    let conversationId = conversationIdInput;
    if (conversationId) {
      const { data: existing } = await sb
        .from('ai_dashboard_assistant_conversations')
        .select('id, user_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!existing || existing.user_id !== user.id) {
        return jsonError(req, 'Conversation not found', 404);
      }
    } else {
      const { data: created, error } = await sb
        .from('ai_dashboard_assistant_conversations')
        .insert({
          organization_id: orgCtx.org.id,
          user_id: user.id,
          property_id: effectivePropertyId,
          title: (message || incomingAttachments[0]?.name || 'New conversation').slice(0, 80),
        })
        .select('id')
        .single();
      if (error || !created) {
        return jsonError(
          req,
          `Failed to create conversation: ${error?.message ?? 'unknown error'}`,
          500
        );
      }
      conversationId = created.id;
    }

    let storedAttachments: Awaited<ReturnType<typeof persistAssistantAttachments>>['stored'] = [];
    let attachmentParts: Awaited<ReturnType<typeof persistAssistantAttachments>>['geminiParts'] =
      [];
    try {
      const persisted = await persistAssistantAttachments({
        organizationId: orgCtx.org.id,
        userId: user.id,
        conversationId,
        attachments: incomingAttachments,
      });
      storedAttachments = persisted.stored;
      attachmentParts = persisted.geminiParts;
    } catch (err) {
      return jsonError(
        req,
        err instanceof Error ? err.message : 'Failed to store attachments',
        400
      );
    }

    const { data: userMessageRow, error: userMessageError } = await sb
      .from('ai_dashboard_assistant_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content_text: message || null,
        blocks: [],
        attachments: storedAttachments,
      })
      .select('id')
      .single();
    if (userMessageError || !userMessageRow) {
      return jsonError(
        req,
        `Failed to persist message: ${userMessageError?.message ?? 'unknown error'}`,
        500
      );
    }

    const facts = await buildHostSafeGroundingFacts(
      orgCtx.org.id,
      user.id,
      effectivePropertyId,
      permissions
    );
    const groundingPrompt = hostSafeGroundingFactsToPrompt(facts);
    const attachedContextLine = attachedContextPromptLines(attachedContext);
    const attachmentLine =
      storedAttachments.length > 0
        ? `\nThe host attached ${storedAttachments.length} file(s): ${storedAttachments.map((a) => `${a.name} (${a.mimeType})`).join(', ')}. Use the file content. For payment receipts, call run_receipt_validation when they ask to check the receipt against a booking.`
        : '';
    const systemPrompt = `${SYSTEM_PROMPT_PREFIX}\n\nKnown facts:\n${groundingPrompt}\n\npageContext: ${JSON.stringify(pageContext)}${attachedContextLine}${attachmentLine}`;

    const toolCtx: ToolExecutionContext = {
      req,
      organizationId: orgCtx.org.id,
      userId: user.id,
      userEmail: user.email ?? '',
      pageContext,
      attachedContext,
      isBulk: false,
    };

    const userTurnText =
      message || (storedAttachments.length > 0 ? 'Please review the attached file(s).' : '');
    const history: GeminiContent[] = [
      { role: 'user', parts: [{ text: userTurnText }, ...attachmentParts] },
    ];
    const toolResultsForGrounding: unknown[] = [];
    let proposedAction: { toolName: string; result: ToolResult } | null = null;
    let executedActions: Array<{ toolName: string; result: ToolResult }> = [];
    let finalText = '';
    let turnCreditsConsumed = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const roundResult = await callGeminiToolCall({
        feature: 'dashboard_assistant',
        organizationId: orgCtx.org.id,
        propertyId: effectivePropertyId,
        systemPrompt,
        userPrompt: userTurnText,
        tools: TOOL_DECLARATIONS,
        toolMode: 'auto',
        history,
        cacheDisabled: true,
        maxOutputTokens: 1024,
        actorUserId: user.id,
        actorType: 'staff',
      });
      turnCreditsConsumed += roundResult.creditsConsumed;

      if (roundResult.toolCalls.length === 0) {
        finalText = roundResult.text ?? '';
        break;
      }

      const writeCallCount = roundResult.toolCalls.filter((tc) =>
        WRITE_TOOL_NAMES.has(tc.name)
      ).length;
      toolCtx.isBulk = writeCallCount > 1;

      history.push({
        role: 'model',
        parts: roundResult.toolCalls.map((tc) => ({
          functionCall: { name: tc.name, args: tc.arguments },
        })),
      });

      const responseParts: GeminiContent['parts'] = [];
      let shortCircuit = false;

      for (const call of roundResult.toolCalls) {
        const result = await executeTool(call.name, call.arguments, toolCtx);
        toolResultsForGrounding.push(result.data ?? result.error);
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: result.data ?? null, error: result.error ?? null },
          },
        });

        if (result.proposed) {
          proposedAction = { toolName: call.name, result };
          shortCircuit = true;
        } else if (WRITE_TOOL_NAMES.has(call.name) && result.ok) {
          executedActions.push({ toolName: call.name, result });
        }
      }

      history.push({ role: 'user', parts: responseParts });

      if (shortCircuit) break;
      if (round === MAX_TOOL_ROUNDS - 1) {
        finalText =
          'I gathered some information but need another prompt to finish — could you ask again?';
      }
    }

    const blocks: ChatBlock[] = [];

    if (proposedAction) {
      const { data: pendingRow, error: pendingError } = await sb
        .from('ai_dashboard_assistant_pending_actions')
        .insert({
          conversation_id: conversationId,
          message_id: userMessageRow.id,
          user_id: user.id,
          tool_name: proposedAction.toolName,
          input_payload: withAssistantScope(
            (proposedAction.result.data ?? {}) as Record<string, unknown>,
            { pageContext, attachedContext }
          ),
          risk_tier: 'tier2_confirmed',
        })
        .select('id')
        .single();
      if (pendingError || !pendingRow) {
        return jsonError(
          req,
          `Failed to persist pending action: ${pendingError?.message ?? 'unknown error'}`,
          500
        );
      }
      const payload = (proposedAction.result.data ?? {}) as Record<string, unknown>;
      blocks.push({
        type: 'action_confirmation',
        actionId: pendingRow.id,
        toolName: proposedAction.toolName,
        riskTier: 'tier2_confirmed',
        summary: String(payload.summary ?? `Confirm ${proposedAction.toolName}`),
        details: Object.entries(payload)
          .filter(([k]) => k !== 'summary' && k !== '__assistantScope')
          .map(([label, value]) => ({ label, value: String(value) })),
        status: 'proposed',
        isExternalSend: isExternalSendTool(proposedAction.toolName),
      });
    } else {
      // Final structured block synthesis — reuses the accumulated tool-call history so blocks
      // are grounded in what actually happened this turn, not a fresh guess.
      const structured = await callGeminiStructured<{ blocks: ChatBlock[] }>(
        {
          feature: 'dashboard_assistant',
          organizationId: orgCtx.org.id,
          propertyId: effectivePropertyId,
          systemPrompt,
          userPrompt: userTurnText,
          history:
            history.length > 0
              ? [
                  ...history,
                  {
                    role: 'model',
                    parts: [{ text: finalText || 'Summarize the above as blocks.' }],
                  },
                ]
              : undefined,
          cacheDisabled: true,
          maxOutputTokens: 1024,
          actorUserId: user.id,
          actorType: 'staff',
        },
        BLOCKS_RESPONSE_SCHEMA
      );
      turnCreditsConsumed += structured.creditsConsumed;

      const candidateBlocks = hydrateAssistantBlocksFromTools(
        sanitizeAssistantChatBlocks(
          structured.data?.blocks?.length
            ? structured.data.blocks
            : [
                {
                  type: 'text' as const,
                  text: finalText || structured.text || "I couldn't generate a response.",
                },
              ]
        ),
        toolResultsForGrounding,
        message
      );

      const groundingText = `${groundingPrompt}\n${JSON.stringify(toolResultsForGrounding)}${attachmentLine}${attachedContextLine}`;
      const grounded = assertBlocksGrounded(candidateBlocks, groundingText);
      const safeBlocks = sanitizeAssistantChatBlocks(
        grounded.ok
          ? candidateBlocks
          : candidateBlocks.filter((_, i) => !grounded.rejectedIndexes.includes(i))
      );
      if (safeBlocks.length === 0) {
        safeBlocks.push({
          type: 'text',
          text: humanizeStatusCodesInText(
            finalText || "I couldn't format that answer. Please ask again."
          ),
        });
      }

      for (const block of executedActions) {
        const payload = (block.result.data ?? {}) as Record<string, unknown>;
        safeBlocks.push({
          type: 'action_confirmation',
          actionId: crypto.randomUUID(),
          toolName: block.toolName,
          riskTier: 'tier1_auto',
          summary: `Done automatically: ${block.toolName}`,
          details: Object.entries(payload).map(([label, value]) => ({
            label,
            value: String(value),
          })),
          status: 'executed',
        });
      }

      const combinedText = safeBlocks
        .map((b) => ('text' in b ? b.text : 'summary' in b ? b.summary : ''))
        .join(' ');
      const quickScan = quickSafetyScan(combinedText);
      if (!quickScan.ok) {
        blocks.push({
          type: 'text',
          text: "I can't share that — it touched something outside what I'm allowed to discuss.",
        });
      } else {
        const safetyCheck = await guardDashboardAssistantResponse(
          {
            organizationId: orgCtx.org.id,
            propertyId: effectivePropertyId,
            actorUserId: user.id,
            actorType: 'staff',
          },
          combinedText,
          groundingPrompt
        );
        turnCreditsConsumed += safetyCheck.creditsConsumed;
        if (!safetyCheck.ok) {
          blocks.push({
            type: 'text',
            text: "I can't share that response — it didn't pass a safety check.",
          });
        } else {
          blocks.push(...safeBlocks);
        }
      }
    }

    for (const action of executedActions) {
      await sb.from('ai_dashboard_assistant_action_audit').insert({
        organization_id: orgCtx.org.id,
        property_id: action.result.auditPropertyId ?? effectivePropertyId,
        booking_id: action.result.auditBookingId ?? null,
        user_id: user.id,
        conversation_id: conversationId,
        message_id: userMessageRow.id,
        tool_name: action.toolName,
        risk_tier: 'tier1_auto',
        input_payload: action.result.data ?? {},
        result_status: action.result.ok ? 'success' : 'failed',
        result_summary: action.result.error ?? null,
      });
    }
    if (executedActions.length > 0) {
      await incrementDashboardAssistantUsage(orgCtx.org.id, { writeAction: true });
    }

    const responseBlocks = nestBookingJourneyStepper(blocks, toolResultsForGrounding);

    await sb.from('ai_dashboard_assistant_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content_text: finalText || null,
      blocks: responseBlocks,
      tool_calls: toolResultsForGrounding.length > 0 ? toolResultsForGrounding : [],
    });

    await sb
      .from('ai_dashboard_assistant_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    await incrementDashboardAssistantUsage(orgCtx.org.id, {
      message: true,
      creditsConsumed: turnCreditsConsumed,
    });

    return jsonSuccess(req, { conversationId, blocks: responseBlocks });
  } catch (err) {
    if (err instanceof PlanFeatureRequiredError) {
      return jsonUpgradeHook(req, err.message, { feature: err.feature });
    }
    if (isAiQuotaError(err)) {
      return jsonResponse(
        req,
        { success: false, error: (err as Error).message, upgradeHook: true },
        429
      );
    }
    if (isAiPlatformDisabledError(err)) {
      return jsonError(req, (err as Error).message, 503);
    }
    return handleEdgeError(req, err, 'dashboard-assistant-chat');
  }
});
