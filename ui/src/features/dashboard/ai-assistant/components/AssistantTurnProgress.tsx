import { useEffect, useMemo, useState } from 'react';

import { Check, Loader2, Sparkles, X } from 'lucide-react';

import type { TurnProgressLiveState } from '@/features/dashboard/ai-assistant/lib/assistantStream';

import { cn } from '@/lib/utils';

export type TurnProgressStep = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
};

type TurnProgressProps = {
  steps?: TurnProgressStep[];
  live?: TurnProgressLiveState | null;
  startedAtMs?: number;
};

const DEFAULT_WAIT_STEPS: Array<{ id: string; label: string; afterMs: number }> = [
  { id: 'understand', label: 'Understanding your question', afterMs: 0 },
  { id: 'gather', label: 'Gathering data from your account', afterMs: 1200 },
  { id: 'answer', label: 'Preparing your answer', afterMs: 4500 },
];

function buildDefaultSteps(elapsedMs: number): TurnProgressStep[] {
  let lastActiveIndex = 0;
  DEFAULT_WAIT_STEPS.forEach((step, index) => {
    if (elapsedMs >= step.afterMs) lastActiveIndex = index;
  });
  return DEFAULT_WAIT_STEPS.map((step, index) => ({
    id: step.id,
    label: step.label,
    status:
      index < lastActiveIndex
        ? 'done'
        : index === lastActiveIndex
          ? 'active'
          : ('pending' as const),
  }));
}

function StepStatusIcon({ status }: { status: TurnProgressStep['status'] }) {
  if (status === 'done') return <Check className="text-primary size-3.5" aria-hidden />;
  if (status === 'failed') return <X className="text-destructive size-3.5" aria-hidden />;
  if (status === 'active') {
    return <Loader2 className="text-primary size-3.5 motion-safe:animate-spin" aria-hidden />;
  }
  return <span className="bg-muted size-1.5 rounded-full" aria-hidden />;
}

/** In-flight turn progress — live SSE tool rows when available, else generic phases. */
export function AssistantTurnProgress({ steps, live, startedAtMs }: TurnProgressProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const origin = startedAtMs ?? Date.now();
    setElapsedMs(Date.now() - origin);
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - origin);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startedAtMs]);

  const resolvedSteps = useMemo(() => {
    if (live?.steps.length) return live.steps;
    if (steps?.length) return steps;
    return buildDefaultSteps(elapsedMs);
  }, [live, steps, elapsedMs]);

  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  const heading = live?.planTitle ?? 'Working…';

  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-live="polite"
        aria-label="Assistant is working on your request"
        className={cn(
          'border-border/60 bg-card w-full max-w-[92%] space-y-2.5 rounded-2xl rounded-bl-md border px-3 py-2.5 shadow-sm',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground inline-flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="size-3.5 motion-safe:animate-pulse" aria-hidden />
            </span>
            {heading}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">{elapsedSec}s</span>
        </div>
        <ol className="space-y-1.5 pl-1">
          {resolvedSteps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-xs">
              <span className="flex size-4 shrink-0 items-center justify-center">
                <StepStatusIcon status={step.status} />
              </span>
              <span
                className={cn(
                  step.status === 'active' && 'text-foreground font-medium',
                  step.status === 'done' && 'text-muted-foreground',
                  step.status === 'pending' && 'text-muted-foreground/70',
                  step.status === 'failed' && 'text-destructive'
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
