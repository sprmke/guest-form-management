import { useEffect, useMemo, useRef, useState } from 'react';

import { Camera, ExternalLink, Loader2, PartyPopper, Sparkles, Ticket } from 'lucide-react';

import {
  VOUCHER_REEL_POOL,
  formatVoucherDiscountMaxLabel,
  formatVoucherPrizeLabel,
  pickPreWinnerTeasers,
  type Voucher,
} from '@/features/guest/sd-form/lib/voucher';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateToLongFormat, normalizeDateString } from '@/utils/format/dates';

type Phase = 'intro' | 'rolling' | 'revealed';

interface VoucherRevealProps {
  /** Guest review / social CTA URL (main platform). */
  reviewSocialUrl: string;
  /** Platform label for CTA copy (e.g. Facebook, Instagram). */
  reviewSocialLabel?: string;
  /** Pre-existing voucher (returning guests skip the animation). */
  existingVoucher?: Voucher | null;
  isClaiming: boolean;
  /** Called when the guest taps "Claim it!". Should resolve with the awarded voucher. */
  onClaim: () => Promise<Voucher>;
  /** Called when the guest taps "Continue to refund process" after the reveal. */
  onContinue: () => void;
  /** Shown on the revealed voucher card (`guest_submissions` MM-DD-YYYY or legacy ISO). */
  primaryGuestName: string;
  checkInDate: string;
  checkOutDate: string;
}

const STRIP_LENGTH = 36;
const WINNING_INDEX = 30;
/** Viewport + each strip row height — must fit chip padding + text or adjacent rows clip. */
const REEL_ROW_HEIGHT_PX = 120;
const REEL_DURATION_MS = 10000;
/** Brief beat after the reel lands before showing the won card. */
const REEL_SETTLE_PAUSE_MS = 500;

/** WAAPI keyframes: quick blur, then ~4s crawling through the last few rows. */
function buildReelKeyframes(offsetPx: number): Keyframe[] {
  const y = (fraction: number) => `translate3d(0, ${-offsetPx * fraction}px, 0)`;

  return [
    { transform: y(0), offset: 0 },
    { transform: y(0.58), offset: 0.1 },
    { transform: y(0.8), offset: 0.2 },
    { transform: y(0.9), offset: 0.3 },
    // Slow pin — last ~3 rows tick by over the remaining ~70% of the timeline
    { transform: y(0.933), offset: 0.38 },
    { transform: y(0.967), offset: 0.48 },
    { transform: y(0.983), offset: 0.58 },
    { transform: y(0.992), offset: 0.68 },
    { transform: y(0.997), offset: 0.8 },
    { transform: y(0.999), offset: 0.9 },
    { transform: y(1), offset: 1 },
  ];
}
/** Shell width matches voucher chips so the border does not span full page width. */
const REEL_SHELL_WIDTH_CLASS = 'mx-auto w-full max-w-sm';

/** Tailwind palette cycled across reel chips for a colourful slot-machine feel. */
const CHIP_TONES = [
  'from-emerald-100 via-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/90',
  'from-sky-100 via-sky-50 to-sky-100 text-sky-700 border-sky-200/90',
  'from-amber-100 via-amber-50 to-amber-100 text-amber-800 border-amber-200/90',
  'from-rose-100 via-rose-50 to-rose-100 text-rose-700 border-rose-200/90',
  'from-violet-100 via-violet-50 to-violet-100 text-violet-700 border-violet-200/90',
  'from-teal-100 via-teal-50 to-teal-100 text-teal-700 border-teal-200/90',
] as const;

function pseudoRandomVoucher(seed: number): Voucher {
  const pool = VOUCHER_REEL_POOL;
  return pool[(seed * 7 + 3) % pool.length] ?? pool[0]!;
}

function buildStrip(winner: Voucher): Voucher[] {
  const strip: Voucher[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    strip.push(pseudoRandomVoucher(i + 1));
  }
  if (WINNING_INDEX >= 3) {
    const [third, second, first] = pickPreWinnerTeasers(winner);
    strip[WINNING_INDEX - 3] = third;
    strip[WINNING_INDEX - 2] = second;
    strip[WINNING_INDEX - 1] = first;
  }
  strip[WINNING_INDEX] = winner;
  return strip;
}

export function VoucherReveal({
  reviewSocialUrl,
  reviewSocialLabel = 'Facebook',
  existingVoucher,
  isClaiming,
  onClaim,
  onContinue,
  primaryGuestName,
  checkInDate,
  checkOutDate,
}: VoucherRevealProps) {
  const [phase, setPhase] = useState<Phase>(existingVoucher ? 'revealed' : 'intro');
  const [winner, setWinner] = useState<Voucher | null>(existingVoucher ?? null);

  const strip = useMemo(() => (winner ? buildStrip(winner) : []), [winner]);

  const handleClaim = async () => {
    try {
      const v = await onClaim();
      // Enter `rolling` with winner set, but the reel must paint once at
      // translateY(0) before we flip `spinActive` — otherwise the browser
      // skips the CSS transition and the voucher appears instantly.
      setWinner(v);
      setPhase('rolling');
    } catch {
      // Caller is expected to surface a toast. Stay in `intro` so the guest
      // can retry — never lock them out of the refund step.
    }
  };

  if (phase === 'revealed' && winner) {
    return (
      <div className="space-y-5">
        <RevealedVoucherCard
          voucher={winner}
          guestName={primaryGuestName}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
        />

        <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <Camera className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <p className="text-sm leading-relaxed text-amber-900">
            <span className="font-semibold">Screenshot your voucher code.</span> Show it with a
            public {reviewSocialLabel} review on your next booking.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {reviewSocialUrl.trim() ? (
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary min-h-[48px] w-full gap-2"
            >
              <a
                href={reviewSocialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
              >
                {`Edit your ${reviewSocialLabel} review`}
                <ExternalLink className="size-4 shrink-0" aria-hidden />
              </a>
            </Button>
          ) : null}

          <Button
            type="button"
            className="shadow-primary/20 min-h-[48px] w-full shadow-md"
            onClick={onContinue}
          >
            Continue to refund process
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'rolling' && winner) {
    return (
      <div className="space-y-5">
        <VoucherIntroCopy />
        <SlotReel key={winner.code} strip={strip} onSpinComplete={() => setPhase('revealed')} />
        <p className="text-primary text-center text-sm font-medium" aria-live="polite">
          The reels are spinning… hang tight, Ka-Homie!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <VoucherIntroCopy />
      <div className={cn('space-y-5', REEL_SHELL_WIDTH_CLASS)}>
        <SlotReelPlaceholder />
        <Button
          type="button"
          className="shadow-primary/25 min-h-[52px] w-full gap-2 text-base font-semibold shadow-lg"
          onClick={handleClaim}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Spinning the reel…
            </>
          ) : (
            <>
              <Sparkles className="size-5" aria-hidden />
              Claim it!
            </>
          )}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          One spin per booking only. Good luck Ka-Homie!
        </p>
      </div>
    </div>
  );
}

function VoucherIntroCopy() {
  return (
    <div className="my-8 space-y-3">
      <div className="text-primary flex items-center justify-center gap-2">
        <PartyPopper className="size-5" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[0.2em]">Thank you, Ka-Homie!</p>
      </div>
      <h2 className="text-foreground text-center text-xl font-bold leading-tight sm:text-2xl">
        Spin for your next-stay reward!
      </h2>
      <p className="text-muted-foreground mx-auto max-w-md text-center text-sm leading-relaxed">
        Thanks for your review! Tap below to win{' '}
        <strong className="text-primary">{formatVoucherDiscountMaxLabel()}</strong> or a{' '}
        <strong className="text-primary">free staycation</strong> on your next booking.
      </p>
    </div>
  );
}

function SlotReelPlaceholder() {
  return (
    <div className="border-primary/30 from-primary/5 via-card to-card relative w-full overflow-hidden rounded-xl border-2 border-dashed bg-gradient-to-br">
      <div className="flex items-center justify-center px-6" style={{ height: REEL_ROW_HEIGHT_PX }}>
        <div className="text-primary flex flex-col items-center justify-center gap-1 px-4 text-center sm:px-6">
          <div className="flex items-center gap-3">
            <Ticket className="size-6 shrink-0" aria-hidden />
            <p className="text-sm font-semibold tracking-wide sm:text-base">
              {formatVoucherDiscountMaxLabel()}
            </p>
          </div>
          <p className="text-primary/80 text-sm font-bold uppercase tracking-wider sm:text-lg">
            or free staycation
          </p>
        </div>
      </div>
    </div>
  );
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      {/* Payline window */}
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
      {/* Edge fade */}
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

function formatVoucherStayLine(checkIn: string, checkOut: string): string {
  const inLabel = formatVoucherDateLabel(checkIn);
  const outLabel = formatVoucherDateLabel(checkOut);
  if (inLabel === '—' && outLabel === '—') return '—';
  if (outLabel === '—' || !checkOut.trim()) return inLabel;
  if (inLabel === '—' || !checkIn.trim()) return outLabel;
  return `${inLabel} – ${outLabel}`;
}

function formatVoucherDateLabel(stored: string): string {
  const raw = (stored ?? '').trim();
  if (!raw) return '—';
  const normalized = normalizeDateString(raw);
  const long = formatDateToLongFormat(normalized);
  return long || raw;
}

function RevealedVoucherCard({
  voucher,
  guestName,
  checkInDate,
  checkOutDate,
}: {
  voucher: Voucher;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const guestDisplay = guestName.trim() || '—';
  const stayLine = formatVoucherStayLine(checkInDate, checkOutDate);

  return (
    <div className="border-primary/40 via-card to-primary/10 shadow-primary/10 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-emerald-200/10 p-5 shadow-xl">
      {/* sparkles top-right */}
      <Sparkles
        className="text-primary/70 absolute right-3 top-3 size-6 animate-pulse"
        aria-hidden
      />
      {/* subtle dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
        aria-hidden
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary/15 text-primary inline-flex size-9 items-center justify-center rounded-full">
            <Ticket className="size-5" aria-hidden />
          </span>
          <p className="text-primary text-xs font-bold uppercase tracking-wider">You won</p>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
            Voucher code
          </p>
          <p className="text-foreground font-mono text-3xl font-extrabold tracking-[0.18em] sm:text-4xl">
            {voucher.code}
          </p>
        </div>

        <div className="divide-primary/15 bg-card/60 ring-primary/20 grid grid-cols-1 divide-y rounded-xl ring-1 backdrop-blur md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Reward
            </p>
            <p className="text-foreground text-sm font-bold tabular-nums">
              {formatVoucherPrizeLabel(voucher)}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Guest
            </p>
            <p className="text-foreground break-words text-sm font-semibold leading-snug">
              {guestDisplay}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Stay
            </p>
            <p className="text-muted-foreground break-words text-sm leading-snug">{stayLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
