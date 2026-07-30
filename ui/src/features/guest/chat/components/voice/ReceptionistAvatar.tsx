import { cn } from '@/lib/utils';

export type ReceptionistAvatarState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

type Props = {
  state: ReceptionistAvatarState;
  /** Live mic/output amplitude, roughly 0..1. */
  amplitude?: number;
  size?: number;
  className?: string;
};

/** Procedural CSS/SVG turtle receptionist — the signature element of the voice overlay. */
export function ReceptionistAvatar({ state, amplitude = 0, size = 160, className }: Props) {
  const amp = Math.max(0, Math.min(1, amplitude));
  const shellScale = 1 + amp * 0.05;
  const mouthRy = state === 'speaking' ? 3 + amp * 7 : 3;
  const bobbing = state === 'idle' || state === 'listening';
  const thinking = state === 'thinking';
  const errored = state === 'error';

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className={cn('h-full w-full', bobbing && 'animate-float')}>
        <svg
          viewBox="0 0 200 200"
          className={cn('h-full w-full transition-transform duration-200 ease-out', errored && 'opacity-60')}
          style={{ transform: `scale(${shellScale})` }}
        >
          <defs>
            <radialGradient id="turtle-shell-fill" cx="35%" cy="28%" r="80%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={errored ? 0.5 : 0.95} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={errored ? 0.35 : 0.75} />
            </radialGradient>
          </defs>

          <g fill="hsl(var(--primary) / 0.55)">
            <ellipse cx="46" cy="160" rx="14" ry="9" />
            <ellipse cx="154" cy="160" rx="14" ry="9" />
            <ellipse cx="38" cy="118" rx="11" ry="15" />
            <ellipse cx="162" cy="118" rx="11" ry="15" />
          </g>

          <ellipse cx="100" cy="116" rx="74" ry="60" fill="url(#turtle-shell-fill)" />
          <g stroke="hsl(var(--background))" strokeOpacity="0.32" strokeWidth="2" fill="none">
            <path d="M100 62 L100 172" />
            <path d="M48 96 L152 96" />
            <path d="M40 132 L160 132" />
            <path d="M66 68 L134 68" />
          </g>

          <g>
            <circle cx="100" cy="52" r="30" fill="hsl(var(--primary))" fillOpacity={errored ? 0.6 : 1} />
            <g className={errored ? '' : 'animate-turtle-blink'} style={{ transformOrigin: '100px 48px' }}>
              <circle cx="88" cy="48" r="5" fill="hsl(var(--background))" />
              <circle cx="112" cy="48" r="5" fill="hsl(var(--background))" />
              <circle cx="88" cy="48" r="2.3" fill="hsl(var(--foreground))" />
              <circle cx="112" cy="48" r="2.3" fill="hsl(var(--foreground))" />
            </g>
            <ellipse
              cx="100"
              cy="64"
              rx="7"
              ry={mouthRy}
              fill="hsl(var(--background))"
              opacity={state === 'speaking' ? 0.9 : 0.45}
            />
          </g>

          {thinking ? (
            <g fill="hsl(var(--primary))">
              <circle cx="142" cy="26" r="4" className="animate-think-dot" />
              <circle
                cx="156"
                cy="18"
                r="3"
                className="animate-think-dot"
                style={{ animationDelay: '150ms' }}
              />
              <circle
                cx="166"
                cy="8"
                r="2.2"
                className="animate-think-dot"
                style={{ animationDelay: '300ms' }}
              />
            </g>
          ) : null}
        </svg>
      </div>

      {state === 'connecting' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}
