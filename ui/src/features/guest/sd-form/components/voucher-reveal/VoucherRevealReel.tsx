import { useEffect, useMemo, useRef } from 'react';

import { Ticket } from 'lucide-react';

import {
  formatVoucherDiscountMaxLabel,
  formatVoucherPrizeLabel,
  pickPreWinnerTeasers,
  type Voucher,
} from '@/features/guest/sd-form/lib/voucher';
import { prefersReducedMotion } from '@/features/guest/sd-form/lib/voucherRevealMotion';

import { cn } from '@/lib/utils';

const STRIP_LENGTH = 36;
const WINNING_INDEX = 30;
/** Viewport + each strip row height — must fit chip padding + text or adjacent rows clip. */
export const REEL_ROW_HEIGHT_PX = 120;
const REEL_DURATION_MS = 10000;
/** Brief beat after the reel lands before showing the won card. */
const REEL_SETTLE_PAUSE_MS = 500;

/** Shell width matches voucher chips so the border does not span full page width. */
export const REEL_SHELL_WIDTH_CLASS = 'mx-auto w-full max-w-sm';

/** Tailwind palette cycled across reel chips for a colourful slot-machine feel. */
const CHIP_TONES = [
  'from-emerald-100 via-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/90',
  'from-sky-100 via-sky-50 to-sky-100 text-sky-700 border-sky-200/90',
  'from-amber-100 via-amber-50 to-amber-100 text-amber-800 border-amber-200/90',
  'from-rose-100 via-rose-50 to-rose-100 text-rose-700 border-rose-200/90',
  'from-orange-100 via-orange-50 to-orange-100 text-orange-800 border-orange-200/90',
  'from-teal-100 via-teal-50 to-teal-100 text-teal-700 border-teal-200/90',
] as const;

/** WAAPI keyframes: quick blur, then ~4s crawling through the last few rows. */
function buildReelKeyframes(offsetPx: number): Keyframe[] {
  const y = (fraction: number) => `translate3d(0, ${-offsetPx * fraction}px, 0)`;

  return [
    { transform: y(0), offset: 0 },
    { transform: y(0.58), offset: 0.1 },
    { transform: y(0.8), offset: 0.2 },
    { transform: y(0.9), offset: 0.3 },
    { transform: y(0.933), offset: 0.38 },
    { transform: y(0.967), offset: 0.48 },
    { transform: y(0.983), offset: 0.58 },
    { transform: y(0.992), offset: 0.68 },
    { transform: y(0.997), offset: 0.8 },
    { transform: y(0.999), offset: 0.9 },
    { transform: y(1), offset: 1 },
  ];
}

function pseudoRandomVoucher(seed: number, pool: ReadonlyArray<Voucher>): Voucher {
  return pool[(seed * 7 + 3) % pool.length] ?? pool[0]!;
}

export function buildVoucherReelStrip(winner: Voucher, pool: ReadonlyArray<Voucher>): Voucher[] {
  const strip: Voucher[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    strip.push(pseudoRandomVoucher(i + 1, pool));
  }
  if (WINNING_INDEX >= 3) {
    const [third, second, first] = pickPreWinnerTeasers(winner, pool);
    strip[WINNING_INDEX - 3] = third;
    strip[WINNING_INDEX - 2] = second;
    strip[WINNING_INDEX - 1] = first;
  }
  strip[WINNING_INDEX] = winner;
  return strip;
}

export function SlotReelPlaceholder({ prizePool }: { prizePool: ReadonlyArray<Voucher> }) {
  const hasFree = prizePool.some((v) => v.amount >= 100 || v.code === 'FREE-STAY');
  return (
    <div className="border-primary/30 from-primary/5 via-card to-card relative w-full overflow-hidden rounded-xl border-2 border-dashed bg-gradient-to-br">
      <div className="flex items-center justify-center px-6" style={{ height: REEL_ROW_HEIGHT_PX }}>
        <div className="text-primary flex flex-col items-center justify-center gap-1 px-4 text-center sm:px-6">
          <div className="flex items-center gap-3">
            <Ticket className="size-6 shrink-0" aria-hidden />
            <p className="text-sm font-semibold tracking-wide sm:text-base">
              {formatVoucherDiscountMaxLabel(prizePool)}
            </p>
          </div>
          {hasFree ? (
            <p className="text-primary/80 text-sm font-bold uppercase tracking-wider sm:text-lg">
              or free stay
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function VoucherRevealReel({
  winner,
  prizePool,
  onSpinComplete,
}: {
  winner: Voucher;
  prizePool: ReadonlyArray<Voucher>;
  onSpinComplete: () => void;
}) {
  const strip = useMemo(() => buildVoucherReelStrip(winner, prizePool), [winner, prizePool]);

  return <SlotReel key={winner.code} strip={strip} onSpinComplete={onSpinComplete} />;
}

function SlotReel({ strip, onSpinComplete }: { strip: Voucher[]; onSpinComplete: () => void }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const completeFired = useRef(false);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  const offsetPx = WINNING_INDEX * REEL_ROW_HEIGHT_PX;

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    completeFired.current = false;
    el.style.transform = 'translate3d(0, 0, 0)';

    const reducedMotion = prefersReducedMotion();
    const duration = reducedMotion ? 1 : REEL_DURATION_MS;

    const finish = () => {
      if (completeFired.current) return;
      completeFired.current = true;
      el.style.transform = `translate3d(0, -${offsetPx}px, 0)`;
      window.setTimeout(
        () => {
          onSpinCompleteRef.current();
        },
        reducedMotion ? 0 : REEL_SETTLE_PAUSE_MS
      );
    };

    let animation: Animation | null = null;
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        animation = el.animate(
          reducedMotion
            ? [{ transform: `translate3d(0, -${offsetPx}px, 0)` }]
            : buildReelKeyframes(offsetPx),
          {
            duration,
            easing: 'linear',
            fill: 'forwards',
          }
        );
        animation.onfinish = finish;
      });
    });

    const fallback = window.setTimeout(finish, duration + REEL_SETTLE_PAUSE_MS + 400);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      animation?.cancel();
      window.clearTimeout(fallback);
    };
  }, [offsetPx]);

  return (
    <div
      className={cn(
        'border-primary/40 bg-card shadow-primary/10 relative overflow-hidden rounded-xl border-2 shadow-lg',
        REEL_SHELL_WIDTH_CLASS
      )}
      role="img"
      aria-label="Spinning voucher reel"
    >
      <div
        className="border-primary/45 bg-primary/[0.04] pointer-events-none absolute inset-x-2 top-1/2 z-20 -translate-y-1/2 rounded-lg border"
        style={{ height: REEL_ROW_HEIGHT_PX - 4 }}
        aria-hidden
      />
      <div
        className="border-primary/55 pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 border-y-2"
        style={{ height: REEL_ROW_HEIGHT_PX }}
        aria-hidden
      />
      <div className="from-card pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b to-transparent" />
      <div className="from-card pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t to-transparent" />
      <div className="relative overflow-hidden" style={{ height: REEL_ROW_HEIGHT_PX }}>
        <div ref={stripRef} className="flex flex-col will-change-transform">
          {strip.map((v, i) => (
            <div
              key={`${v.code}-${i}`}
              className="box-border flex w-full shrink-0 items-center px-2 py-1"
              style={{ height: REEL_ROW_HEIGHT_PX }}
            >
              <div
                className={cn(
                  'flex h-[104px] w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-gradient-to-r px-3',
                  CHIP_TONES[i % CHIP_TONES.length]
                )}
              >
                <span className="min-w-0 truncate font-mono text-xs font-bold tracking-wide sm:text-sm">
                  {v.code}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums sm:text-base">
                  {formatVoucherPrizeLabel(v)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
