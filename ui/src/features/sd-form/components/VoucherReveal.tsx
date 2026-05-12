import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TransitionEvent,
} from 'react';
import {
  Camera,
  ExternalLink,
  Loader2,
  PartyPopper,
  Sparkles,
  Ticket,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VOUCHER_CATALOG, type Voucher } from '@/features/sd-form/lib/voucher';
import { formatDateToLongFormat, normalizeDateString } from '@/utils/dates';

type Phase = 'intro' | 'rolling' | 'revealed';

interface VoucherRevealProps {
  /** Facebook reviews URL (shown again after the voucher so guests can open or re-open the page). */
  facebookReviewsUrl: string;
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

const STRIP_LENGTH = 32;
const WINNING_INDEX = 27;
/** Viewport + each strip row height — must fit chip padding + text or adjacent rows clip. */
const REEL_ROW_HEIGHT_PX = 120;
const REEL_DURATION_MS = 2600;
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
  return VOUCHER_CATALOG[(seed * 7 + 3) % VOUCHER_CATALOG.length];
}

function buildStrip(winner: Voucher): Voucher[] {
  const strip: Voucher[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    strip.push(pseudoRandomVoucher(i + 1));
  }
  strip[WINNING_INDEX] = winner;
  return strip;
}

export function VoucherReveal({
  facebookReviewsUrl,
  existingVoucher,
  isClaiming,
  onClaim,
  onContinue,
  primaryGuestName,
  checkInDate,
  checkOutDate,
}: VoucherRevealProps) {
  const [phase, setPhase] = useState<Phase>(
    existingVoucher ? 'revealed' : 'intro',
  );
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
          <Camera
            className="mt-0.5 size-5 shrink-0 text-amber-700"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-amber-900">
            <span className="font-semibold">Screenshot your voucher code.</span>{' '}
            Present it together with your Facebook review on your next booking
            to claim the discount. Please make sure the review is{' '}
            <span className="font-semibold">public</span> so we can verify it.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            variant="outline"
            className="min-h-[48px] w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <a
              href={facebookReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2"
            >
              Edit your Facebook review
              <ExternalLink className="size-4 shrink-0" aria-hidden />
            </a>
          </Button>

          <Button
            type="button"
            className="min-h-[48px] w-full shadow-md shadow-primary/20"
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
        <SlotReel
          key={winner.code}
          strip={strip}
          onSpinComplete={() => setPhase('revealed')}
        />
        <p className="text-center text-xs text-muted-foreground">
          Picking your reward…
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
          className="min-h-[52px] w-full gap-2 text-base font-semibold shadow-lg shadow-primary/25"
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
        <p className="text-center text-xs text-muted-foreground">
          One spin per booking only. Good luck Ka-Homie!
        </p>
      </div>
    </div>
  );
}

function VoucherIntroCopy() {
  return (
    <div className="space-y-3 my-8">
      <div className="flex items-center justify-center gap-2 text-primary">
        <PartyPopper className="size-5" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[0.2em]">
          Thank you, Ka-Homie!
        </p>
      </div>
      <h2 className="text-center text-xl font-bold leading-tight text-foreground sm:text-2xl">
        Enjoy your next-stay discount!
      </h2>
      <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-muted-foreground">
        Your reviews means a lot to us as small unit owners! As a token of
        appreciation, tap the button below to{' '}
        <strong className="text-primary">win a voucher discount</strong> on your
        next booking.
      </p>
    </div>
  );
}

function SlotReelPlaceholder() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <div
        className="flex items-center justify-center px-6"
        style={{ height: REEL_ROW_HEIGHT_PX }}
      >
        <div className="flex items-center gap-3 text-primary">
          <Ticket className="size-6" aria-hidden />
          <p className="text-sm font-semibold tracking-wide sm:text-base">
            ₱100 - ₱500 discount
          </p>
        </div>
      </div>
    </div>
  );
}

function SlotReel({
  strip,
  onSpinComplete,
}: {
  strip: Voucher[];
  onSpinComplete: () => void;
}) {
  /** Must go false → true on a later frame or the CSS transition is skipped. */
  const [spinActive, setSpinActive] = useState(false);
  const completeFired = useRef(false);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setSpinActive(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (completeFired.current) return;
      completeFired.current = true;
      onSpinCompleteRef.current();
    }, REEL_DURATION_MS + 800);
    return () => window.clearTimeout(t);
  }, []);

  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (!spinActive) return;
    if (completeFired.current) return;
    completeFired.current = true;
    onSpinCompleteRef.current();
  };

  const offsetPx = WINNING_INDEX * REEL_ROW_HEIGHT_PX;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-primary/5 shadow-inner',
        REEL_SHELL_WIDTH_CLASS,
      )}
    >
      {/* fade edges — sit inside the single outer border (no second frame). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 rounded-t-2xl bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 rounded-b-2xl bg-gradient-to-t from-card to-transparent" />
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{
          height: REEL_ROW_HEIGHT_PX,
        }}
      >
        <div
          className="flex min-h-0 flex-col will-change-transform"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: spinActive
              ? `translate3d(0, -${offsetPx}px, 0)`
              : 'translate3d(0, 0, 0)',
            transition: spinActive
              ? `transform ${REEL_DURATION_MS}ms cubic-bezier(0.18, 0.62, 0.22, 1.05)`
              : 'none',
          }}
        >
          {strip.map((v, i) => (
            <div
              key={`${v.code}-${i}`}
              className="box-border flex w-full shrink-0 items-stretch justify-center overflow-hidden px-2"
              style={{ height: REEL_ROW_HEIGHT_PX }}
            >
              <div
                className={cn(
                  'flex h-full min-h-0 w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-gradient-to-r px-3 py-2',
                  CHIP_TONES[i % CHIP_TONES.length],
                )}
              >
                <span className="min-w-0 truncate font-mono text-xs font-bold tracking-wide sm:text-sm">
                  {v.code}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums sm:text-base">
                  ₱{v.amount.toLocaleString('en-PH')}
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-emerald-50 via-card to-primary/10 p-5 shadow-xl shadow-primary/10">
      {/* sparkles top-right */}
      <Sparkles
        className="absolute right-3 top-3 size-6 animate-pulse text-primary/70"
        aria-hidden
      />
      {/* subtle dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
        aria-hidden
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Ticket className="size-5" aria-hidden />
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            You won
          </p>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Voucher code
          </p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.18em] text-foreground sm:text-4xl">
            {voucher.code}
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-primary/15 rounded-xl bg-white/60 ring-1 ring-primary/20 backdrop-blur md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Discount
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              ₱{voucher.amount.toLocaleString('en-PH')}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Guest
            </p>
            <p className="break-words text-sm font-semibold leading-snug text-foreground">
              {guestDisplay}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Stay
            </p>
            <p className="break-words text-sm leading-snug text-muted-foreground">
              {stayLine}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
