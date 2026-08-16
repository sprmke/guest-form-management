import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const WARN_THRESHOLD_MS = 2 * 60_000;

function useRemainingMs(expiresAt: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return new Date(expiresAt).getTime() - now;
}

function formatCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type Props = {
  expiresAt: string;
  className?: string;
};

/**
 * Host-facing time-remaining indicator for a broadcast request in PENDING_HOST_ACCEPTANCE.
 * Ticks every second visually; the rounded-minute sr-only text only changes at minute
 * boundaries, so aria-live="polite" naturally announces once a minute, not every second.
 */
export function ParkingBroadcastCountdown({ expiresAt, className }: Props) {
  const remainingMs = useRemainingMs(expiresAt);
  if (remainingMs <= 0) return null;

  const warn = remainingMs < WARN_THRESHOLD_MS;
  const roundedMinutes = Math.ceil(remainingMs / 60_000);
  const minutesLabel =
    roundedMinutes <= 1 ? 'Less than a minute remaining' : `${roundedMinutes} minutes remaining`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        warn ? 'text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      Expires in {formatCountdown(remainingMs)}
      <span className="sr-only" aria-live="polite">
        {minutesLabel}
      </span>
    </span>
  );
}
