import type { ReceptionistAvatarState } from '@/features/guest/chat/components/voice/receptionistAvatarTypes';

import { cn } from '@/lib/utils';

type Props = {
  state: ReceptionistAvatarState;
  amplitude?: number;
  size?: number;
  className?: string;
};

/**
 * WebGL / load failure fallback — refined 2D face plate (not the v1 turtle).
 * Driven by the same state + amplitude props as the 3D head.
 */
export function ReceptionistFacePlate({ state, amplitude = 0, size = 160, className }: Props) {
  const amp = Math.max(0, Math.min(1, amplitude));
  const speaking = state === 'speaking';
  const thinking = state === 'thinking';
  const listening = state === 'listening';
  const errored = state === 'error';
  const mouthRy = speaking ? 4 + amp * 10 : thinking ? 2.5 : 3.5;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 200 200" className={cn('h-full w-full', errored && 'opacity-60')}>
        <defs>
          <radialGradient id="face-plate-skin" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#E8D5C4" />
            <stop offset="100%" stopColor="#C4A484" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="78" fill="url(#face-plate-skin)" />
        <ellipse cx="100" cy="118" rx="52" ry="48" fill="#C4A484" opacity="0.25" />

        <g>
          <ellipse
            cx="72"
            cy="88"
            rx="10"
            ry={listening || speaking ? 11 : 9}
            fill="#1A221C"
            opacity={errored ? 0.45 : 0.9}
          />
          <ellipse
            cx="128"
            cy="88"
            rx="10"
            ry={listening || speaking ? 11 : 9}
            fill="#1A221C"
            opacity={errored ? 0.45 : 0.9}
          />
          <circle cx="74" cy="86" r="3" fill="#F5F2EA" opacity="0.7" />
          <circle cx="130" cy="86" r="3" fill="#F5F2EA" opacity="0.7" />
        </g>

        <path
          d="M88 112 Q100 118 112 112"
          fill="none"
          stroke="#8B6914"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />

        <ellipse
          cx="100"
          cy="138"
          rx={speaking ? 14 + amp * 4 : 12}
          ry={mouthRy}
          fill="#1A221C"
          opacity={speaking ? 0.85 : 0.45}
        />

        {thinking ? (
          <g fill="#C4A35A" opacity="0.9">
            <circle cx="148" cy="48" r="4">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="160" cy="36" r="5.5">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.2s"
                begin="0.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="172" cy="22" r="7">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.2s"
                begin="0.4s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
