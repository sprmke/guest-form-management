/**
 * SSE client for dashboard-assistant-chat streaming turns.
 * Mirror: supabase/functions/_shared/dashboardAssistantStreamEvents.ts
 */

import type { ChatBlock } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import type { AttachedContextItem } from '@/features/dashboard/ai-assistant/lib/attachedContext';
import type { PageContext } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';

export type AssistantStreamPhase =
  'understanding' | 'planning' | 'executing' | 'synthesizing' | 'safety';

export type TaskPlanStepStatus = 'pending' | 'running' | 'done' | 'failed';

export type AssistantStreamTaskPlanStep = {
  id: string;
  label: string;
  status: TaskPlanStepStatus;
  toolName?: string;
};

export type AssistantStreamEvent =
  | { type: 'phase'; phase: AssistantStreamPhase; label?: string }
  | { type: 'tool_start'; toolName: string; label: string; stepId?: string }
  | { type: 'tool_done'; toolName: string; ok: boolean; durationMs: number; stepId?: string }
  | { type: 'plan'; title: string; steps: AssistantStreamTaskPlanStep[] }
  | { type: 'plan_update'; stepId: string; status: TaskPlanStepStatus }
  | { type: 'text_start' }
  | { type: 'text_chunk'; delta: string }
  | {
      type: 'blocks';
      conversationId: string;
      blocks: ChatBlock[];
      upgradeHook?: boolean;
    }
  | { type: 'error'; message: string; upgradeHook?: boolean; aborted?: boolean };

export type StreamChatMessageInput = {
  orgSlug: string;
  conversationId?: string | null;
  pageContext: PageContext;
  attachedContext?: AttachedContextItem[];
  message: string;
  attachments?: Array<{ name: string; mimeType: string; dataBase64: string }>;
  /** Re-run the last user turn without inserting a duplicate user message. */
  regenerate?: boolean;
};

export type StreamChatMessageHandlers = {
  onEvent?: (event: AssistantStreamEvent) => void;
  signal?: AbortSignal;
};

export class AssistantStreamAbortedError extends Error {
  override readonly name = 'AssistantStreamAbortedError';
  constructor(message = 'Turn cancelled') {
    super(message);
  }
}

function baseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
}

function parseSseChunk(buffer: string): { events: AssistantStreamEvent[]; rest: string } {
  const events: AssistantStreamEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    const line = part
      .split('\n')
      .find((row) => row.startsWith('data: '))
      ?.slice(6);
    if (!line) continue;
    try {
      events.push(JSON.parse(line) as AssistantStreamEvent);
    } catch {
      // ignore malformed chunks
    }
  }
  return { events, rest };
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return (
    name === 'AbortError' ||
    name === 'AssistantStreamAbortedError' ||
    err instanceof AssistantStreamAbortedError
  );
}

export async function streamChatMessage(
  input: StreamChatMessageInput,
  handlers: StreamChatMessageHandlers = {}
): Promise<{ conversationId: string; blocks: ChatBlock[]; upgradeHook?: boolean }> {
  const jwt = await getSessionJwt();
  const res = await fetch(`${baseUrl()}/dashboard-assistant-chat`, {
    method: 'POST',
    signal: handlers.signal,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      ...input,
      stream: true,
      regenerate: input.regenerate === true ? true : undefined,
    }),
  });

  const contentType = res.headers.get('Content-Type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    const json = (await res.json()) as {
      success?: boolean;
      error?: string;
      data?: { conversationId: string; blocks: ChatBlock[]; upgradeHook?: boolean };
      upgradeHook?: boolean;
    };
    if (!res.ok || !json.success) {
      const err = new Error(json.error ?? 'Request failed') as Error & {
        status?: number;
        upgradeHook?: boolean;
      };
      err.status = res.status;
      err.upgradeHook = json.upgradeHook === true;
      throw err;
    }
    const data = json.data!;
    return {
      conversationId: data.conversationId,
      blocks: data.blocks,
      upgradeHook: data.upgradeHook,
    };
  }

  if (!res.ok || !res.body) {
    throw new Error('Stream request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: { conversationId: string; blocks: ChatBlock[]; upgradeHook?: boolean } | null =
    null;

  try {
    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      streamDone = done;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        handlers.onEvent?.(event);
        if (event.type === 'blocks') {
          finalResult = {
            conversationId: event.conversationId,
            blocks: event.blocks,
            upgradeHook: event.upgradeHook,
          };
        }
        if (event.type === 'error') {
          if (event.aborted) {
            throw new AssistantStreamAbortedError(event.message);
          }
          const err = new Error(event.message) as Error & { upgradeHook?: boolean };
          err.upgradeHook = event.upgradeHook;
          throw err;
        }
      }
    }
  } catch (err) {
    if (handlers.signal?.aborted || isAbortError(err)) {
      if (finalResult) return finalResult;
      throw err instanceof AssistantStreamAbortedError ? err : new AssistantStreamAbortedError();
    }
    throw err;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (!finalResult) {
    throw new Error('Stream ended without a response');
  }
  return finalResult;
}

export type TurnProgressLiveState = {
  steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'done' | 'failed' }>;
  planTitle?: string;
};

function phaseLabel(phase: AssistantStreamPhase, explicit?: string): string {
  if (explicit) return explicit;
  if (phase === 'understanding') return 'Understanding your question';
  if (phase === 'executing') return 'Gathering data from your account';
  if (phase === 'synthesizing') return 'Preparing your answer';
  if (phase === 'safety') return 'Checking response safety';
  return 'Working on your request';
}

export function buildTurnProgressFromStreamEvent(
  prev: TurnProgressLiveState | null,
  event: AssistantStreamEvent
): TurnProgressLiveState | null {
  if (event.type === 'plan') {
    return {
      planTitle: event.title,
      steps: event.steps.map((step) => ({
        id: step.id,
        label: step.label,
        status:
          step.status === 'running'
            ? 'active'
            : step.status === 'pending'
              ? 'pending'
              : step.status === 'failed'
                ? 'failed'
                : 'done',
      })),
    };
  }
  if (event.type === 'plan_update' && prev) {
    return {
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === event.stepId
          ? {
              ...step,
              status:
                event.status === 'running'
                  ? 'active'
                  : event.status === 'pending'
                    ? 'pending'
                    : event.status === 'failed'
                      ? 'failed'
                      : 'done',
            }
          : step
      ),
    };
  }
  if (event.type === 'tool_start') {
    const steps = prev?.steps ?? [];
    if (event.stepId && steps.some((s) => s.id === event.stepId)) {
      return buildTurnProgressFromStreamEvent(prev, {
        type: 'plan_update',
        stepId: event.stepId,
        status: 'running',
      });
    }
    const nextSteps = [
      ...steps
        .filter((s) => !s.id.startsWith('phase-'))
        .map((s) => (s.status === 'active' ? { ...s, status: 'done' as const } : s)),
      { id: event.stepId ?? event.toolName, label: event.label, status: 'active' as const },
    ];
    return { planTitle: prev?.planTitle, steps: nextSteps };
  }
  if (event.type === 'tool_done') {
    const steps = prev?.steps ?? [];
    const targetId = event.stepId ?? event.toolName;
    if (steps.length === 0) {
      return {
        steps: [
          {
            id: targetId,
            label: event.ok ? 'Done' : 'Failed',
            status: event.ok ? 'done' : 'failed',
          },
        ],
      };
    }
    return {
      planTitle: prev?.planTitle,
      steps: steps.map((step) =>
        step.id === targetId ? { ...step, status: event.ok ? 'done' : 'failed' } : step
      ),
    };
  }
  if (event.type === 'phase') {
    const label = phaseLabel(event.phase, event.label);
    if (!prev?.steps.length) {
      return {
        steps: [{ id: `phase-${event.phase}`, label, status: 'active' }],
      };
    }
    if (event.phase === 'synthesizing' || event.phase === 'safety') {
      return {
        planTitle: prev.planTitle,
        steps: [
          ...prev.steps
            .filter((s) => !s.id.startsWith('phase-'))
            .map((s) => (s.status === 'active' ? { ...s, status: 'done' as const } : s)),
          { id: `phase-${event.phase}`, label, status: 'active' },
        ],
      };
    }
    return prev;
  }
  return prev;
}
