import type { ReceptionistAvatarState } from '@/features/guest/chat/components/voice/ReceptionistAvatar';

import { cn } from '@/lib/utils';

type Props = {
  state: ReceptionistAvatarState;
  /** 0..1 — drives speaking glow strength. */
  amplitude?: number;
  className?: string;
};

/**
 * Booth ring around the receptionist avatar.
 * Listening = soft pulse; thinking = spin chase; speaking = amplitude stroke.
 * Stroke color follows theme via `currentColor`.
 */
export function VoiceBoothRing({ state, amplitude = 0, className }: Props) {
  const amp = Math.max(0, Math.min(1, amplitude));
  const listening = state === 'listening' || state === 'idle';
  const thinking = state === 'thinking' || state === 'connecting';
  const speaking = state === 'speaking';
  const errored = state === 'error';

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        errored ? 'text-destructive' : thinking ? 'text-warning' : 'text-primary',
        className
      )}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeOpacity={speaking ? 0.35 + amp * 0.5 : thinking ? 0.75 : 0.5}
        strokeWidth={speaking ? 1.25 + amp * 2.5 : 1.5}
        strokeLinecap="round"
        strokeDasharray={thinking ? '10 8' : undefined}
        className={cn(
          'origin-center transition-[stroke-width,stroke-opacity] duration-150',
          listening && 'motion-safe:animate-pulse',
          thinking && 'motion-safe:animate-spin'
        )}
        style={{ transformOrigin: '50px 50px' }}
      />
    </svg>
  );
}
