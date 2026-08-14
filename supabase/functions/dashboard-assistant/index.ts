/**
 * dashboard-assistant — AI ops assistant for org-scoped hosts.
 * Auth: any org member with `org:dashboard:view`.
 * Body: { message: string, propertyId?: string }
 */

import {
  buildDashboardAssistantContext,
  contextToPrompt,
} from '../_shared/dashboardAssistantContext.ts';
import {
  classifyDashboardMessage,
  isRiskAllowed,
} from '../_shared/dashboardAssistantRiskClassifier.ts';
import {
  guardDashboardAssistantResponse,
  quickSafetyScan,
} from '../_shared/dashboardAssistantSafetyGuard.ts';
import { callGeminiToolCall } from '../_shared/geminiToolCallClient.ts';
import {
  handleEdgeError,
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('dashboard-assistant', async (req, user) => {
  try {
    requireHttpMethod(req, 'POST');
    const ctx = await resolveOrgAccessContext(req, 'org:dashboard:view');
    const body = await readJsonBody(req);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return jsonError(req, 'message is required');
    }
    const propertyId =
      typeof body.propertyId === 'string' && body.propertyId.trim() ? body.propertyId.trim() : null;

    const risk = await classifyDashboardMessage(
      { organizationId: ctx.org.id, propertyId: propertyId ?? undefined, userPrompt: message },
      message
    );
    if (!isRiskAllowed(risk.risk)) {
      return jsonSuccess(req, {
        reply:
          'I cannot help with that. Please ask about your property operations, bookings, or Kame Homes features.',
        risk,
        guard: { ok: false, violation: risk.reason },
      });
    }

    const assistantContext = await buildDashboardAssistantContext(ctx.org.id, user.id, propertyId);
    const systemPrompt = contextToPrompt(assistantContext);

    const ai = await callGeminiToolCall({
      feature: 'dashboard_assistant',
      organizationId: ctx.org.id,
      propertyId,
      systemPrompt,
      userPrompt: message,
      temperature: 0.2,
      maxOutputTokens: 1024,
      cacheInputs: { permissions: assistantContext.effectivePermissions },
    });

    const reply = ai.text ?? 'I could not generate a response.';

    const quick = quickSafetyScan(reply);
    if (!quick.ok) {
      return jsonSuccess(req, {
        reply: 'I could not produce a safe answer for that.',
        risk,
        guard: quick,
      });
    }

    const guard = await guardDashboardAssistantResponse(
      { organizationId: ctx.org.id, propertyId: propertyId ?? undefined },
      reply,
      contextToPrompt(assistantContext)
    );
    if (!guard.ok) {
      return jsonSuccess(req, {
        reply: 'I could not produce a safe answer for that.',
        risk,
        guard,
      });
    }

    return jsonSuccess(req, { reply, risk, guard, toolCalls: ai.toolCalls });
  } catch (error) {
    return handleEdgeError(req, error, 'dashboard-assistant');
  }
});
