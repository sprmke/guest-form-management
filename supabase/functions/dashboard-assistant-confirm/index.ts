/**
 * dashboard-assistant-confirm — executes (or denies) a previously-proposed Tier-2 action.
 * Docs: docs/workflow/planned/ai-dashboard-assistant.md §1. Deliberately separate from
 * dashboard-assistant-chat so a Tier-2 action can only ever run via an explicit, isolated call —
 * never as a side effect of the model "changing its mind" mid-generation or a retried chat POST.
 *
 * Body: { actionId: string, confirm: boolean }
 */

import { incrementDashboardAssistantUsage } from '../_shared/dashboardAssistantSettings.ts';
import { stripAssistantScopeFromPayload } from '../_shared/dashboardAssistantAttachedContext.ts';
import {
  executeConfirmedAction,
  type ToolExecutionContext,
} from '../_shared/dashboardAssistantTools.ts';
import {
  handleEdgeError,
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function updateActionBlockStatus(blocks: unknown, actionId: string, status: string) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) =>
    block &&
    typeof block === 'object' &&
    block.type === 'action_confirmation' &&
    block.actionId === actionId
      ? { ...block, status }
      : block
  );
}

serveAuthenticated('dashboard-assistant-confirm', async (req, user) => {
  try {
    requireHttpMethod(req, 'POST');
    const body = await readJsonBody(req);
    const actionId = String(body.actionId ?? '').trim();
    const confirm = body.confirm === true;
    if (!actionId) return jsonError(req, 'actionId is required', 400);

    const sb = createServiceClient();
    const { data: pending, error: pendingError } = await sb
      .from('ai_dashboard_assistant_pending_actions')
      .select('*')
      .eq('id', actionId)
      .maybeSingle();
    if (pendingError || !pending) {
      return jsonError(req, 'Pending action not found', 404);
    }
    if (pending.user_id !== user.id) {
      return jsonError(req, 'Only the user who proposed this action may confirm it', 403);
    }
    if (pending.status !== 'pending') {
      return jsonSuccess(req, { status: pending.status, alreadyResolved: true });
    }
    if (new Date(pending.expires_at as string).getTime() < Date.now()) {
      await sb
        .from('ai_dashboard_assistant_pending_actions')
        .update({ status: 'expired' })
        .eq('id', actionId);
      return jsonError(req, 'This action has expired — ask the assistant again', 410);
    }

    const { data: conversation } = await sb
      .from('ai_dashboard_assistant_conversations')
      .select('organization_id, property_id')
      .eq('id', pending.conversation_id)
      .maybeSingle();
    if (!conversation) return jsonError(req, 'Conversation not found', 404);

    if (!confirm) {
      await sb
        .from('ai_dashboard_assistant_pending_actions')
        .update({ status: 'denied' })
        .eq('id', actionId);
      await sb
        .from('ai_dashboard_assistant_messages')
        .select('id, blocks')
        .eq('id', pending.message_id)
        .maybeSingle()
        .then(async ({ data: msg }) => {
          if (msg) {
            await sb
              .from('ai_dashboard_assistant_messages')
              .update({ blocks: updateActionBlockStatus(msg.blocks, actionId, 'denied') })
              .eq('id', msg.id);
          }
        });
      return jsonSuccess(req, { status: 'denied' });
    }

    const rawPayload = (pending.input_payload ?? {}) as Record<string, unknown>;
    const { payload: inputPayload, scope } = stripAssistantScopeFromPayload(rawPayload);
    const toolCtx: ToolExecutionContext = {
      req,
      organizationId: conversation.organization_id as string,
      userId: user.id,
      userEmail: user.email ?? '',
      pageContext: scope?.pageContext ?? {
        propertyId: (conversation.property_id as string | null) ?? null,
        bookingId: (inputPayload.bookingId as string | undefined) ?? null,
      },
      attachedContext: scope?.attachedContext ?? [],
      isBulk: false,
    };

    const result = await executeConfirmedAction(pending.tool_name as string, inputPayload, toolCtx);
    const newStatus = result.ok ? 'executed' : 'denied';

    await sb
      .from('ai_dashboard_assistant_pending_actions')
      .update({ status: newStatus })
      .eq('id', actionId);

    await sb.from('ai_dashboard_assistant_action_audit').insert({
      organization_id: conversation.organization_id,
      property_id: result.auditPropertyId ?? conversation.property_id,
      booking_id: result.auditBookingId ?? null,
      user_id: user.id,
      conversation_id: pending.conversation_id,
      message_id: pending.message_id,
      tool_name: pending.tool_name,
      risk_tier: 'tier2_confirmed',
      input_payload: inputPayload,
      result_status: result.ok ? 'success' : 'failed',
      result_summary: result.error ?? null,
    });

    const { data: msg } = await sb
      .from('ai_dashboard_assistant_messages')
      .select('id, blocks')
      .eq('id', pending.message_id)
      .maybeSingle();
    if (msg) {
      await sb
        .from('ai_dashboard_assistant_messages')
        .update({ blocks: updateActionBlockStatus(msg.blocks, actionId, newStatus) })
        .eq('id', msg.id);
    }

    if (result.ok) {
      await incrementDashboardAssistantUsage(conversation.organization_id as string, {
        writeAction: true,
      });
    }

    return jsonSuccess(req, {
      status: newStatus,
      ok: result.ok,
      error: result.error,
      data: result.data,
    });
  } catch (err) {
    return handleEdgeError(req, err, 'dashboard-assistant-confirm');
  }
});
