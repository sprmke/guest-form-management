import { cn } from '@/lib/utils';

type Props = {
  /** 0..1 mic / playback level. */
  amplitude?: number;
  active?: boolean;
  className?: string;
};

const BAR_SCALES = [0.35, 0.7, 1, 0.85, 0.55, 0.9, 0.4];

/** Thin mic-level bars under the avatar (Phase 6.3). Height follows amplitude; no custom keyframes. */
export function VoiceMicWaveform({ amplitude = 0, active = true, className }: Props) {
  const amp = active ? Math.max(0.08, Math.min(1, amplitude)) : 0.12;

  return (
    <div className={cn('flex h-6 items-end justify-center gap-1', className)} aria-hidden>
      {BAR_SCALES.map((scale, i) => {
        const h = Math.max(3, Math.round(22 * scale * (active ? amp : 0.15)));
        return (
          <span
            key={i}
            className="w-1 rounded-full bg-[#3D9B6A]/75 transition-[height] duration-75"
            style={{
              height: h,
              opacity: 0.45 + amp * 0.55,
            }}
          />
        );
      })}
    </div>
  );
}
