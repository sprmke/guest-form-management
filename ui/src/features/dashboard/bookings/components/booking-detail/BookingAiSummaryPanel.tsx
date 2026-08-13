/**
 * Booking AI summary modal — idle / running / results.
 * No progress stepper: polling mid-run is unreliable, so the running state shows the
 * shape of the answer (the same rows, scanned by a moving beam) rather than claiming
 * per-section progress it cannot know.
 */

import { useCallback, useEffect, useMemo, type ElementType } from 'react';

import {
  AlertTriangle,
  CalendarDays,
  Car,
  Check,
  Clock,
  MinusCircle,
  PawPrint,
  Receipt,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import { useBookingAiReview } from '@/features/dashboard/bookings/hooks/useBookingAiReview';
import { useBookingAiReviewTrigger } from '@/features/dashboard/bookings/hooks/useBookingAiReviewTrigger';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import {
  bookingAiSectionDocumentRefs,
  collectBookingAiDocumentRefs,
  linkifyBookingAiText,
  type BookingAiDocumentRef,
} from '@/features/dashboard/bookings/lib/bookingAiDocumentLinks';
import {
  isBookingAiReviewRunning,
  isStuckProcessingReview,
} from '@/features/dashboard/bookings/lib/bookingAiReviewProgress';
import {
  resolveSectionOutcome,
  sanitizeAiReviewFlags,
  sanitizeAiReviewSummary,
  type SectionOutcome,
} from '@/features/dashboard/bookings/lib/bookingAiValidations';
import type {
  BookingAiReview,
  BookingAiReviewFlag,
  BookingAiReviewSectionResult,
  BookingAiReviewSectionStatus,
  BookingRow,
} from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';

type SectionId = 'stay_details' | 'guests' | 'parking' | 'pets' | 'pricing';

type SectionDef = {
  id: SectionId;
  label: string;
  icon: ElementType<{ className?: string }>;
  optional: (booking: BookingRow) => boolean;
};

const SECTIONS: SectionDef[] = [
  { id: 'stay_details', label: 'Stay', icon: CalendarDays, optional: () => false },
  { id: 'guests', label: 'Guests', icon: Users, optional: () => false },
  { id: 'parking', label: 'Parking', icon: Car, optional: () => false },
  { id: 'pets', label: 'Pets', icon: PawPrint, optional: (b) => !b.has_pets },
  { id: 'pricing', label: 'Pricing', icon: Receipt, optional: () => false },
];

/** Width of the verdict column — fits "Action needed" on one line at 11px. */
const STATUS_COLUMN = 'w-[104px]';

/**
 * `text-warning` is amber at 56% lightness and unreadable on a light tint, hence the
 * darker foreground token on light and the plain token on dark.
 */
function statusVisual(variant: SectionOutcome['variant']): {
  surface: string;
  text: string;
  icon?: ElementType<{ className?: string }>;
} {
  switch (variant) {
    case 'pass':
      return {
        surface: 'border-success/30 bg-success/10 text-success',
        text: 'text-success',
        icon: Check,
      };
    case 'review':
      return {
        surface: 'border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning',
        text: 'text-warning-foreground dark:text-warning',
        icon: AlertTriangle,
      };
    case 'issue':
      return {
        surface: 'border-destructive/30 bg-destructive/10 text-destructive',
        text: 'text-destructive',
        icon: X,
      };
    // Breathing dot, not a spinner — the running list already carries the motion.
    case 'checking':
      return { surface: 'border-primary/30 bg-primary/10 text-primary', text: 'text-primary' };
    case 'queued':
      return {
        surface: 'border-border bg-muted text-muted-foreground',
        text: 'text-muted-foreground',
        icon: Clock,
      };
    default:
      return {
        surface: 'border-border bg-muted text-muted-foreground',
        text: 'text-muted-foreground',
        icon: MinusCircle,
      };
  }
}

function StatusMark({ outcome, className }: { outcome: SectionOutcome; className?: string }) {
  const { surface, icon: Icon } = statusVisual(outcome.variant);
  return (
    <span
      className={cn('flex items-center justify-center rounded-full border', surface, className)}
      aria-hidden
    >
      {Icon ? (
        <Icon className="size-4" />
      ) : (
        <span className="bg-primary size-2 animate-pulse rounded-full" />
      )}
    </span>
  );
}

/** Stacked verdict for the right-hand column: mark above, words beneath. */
function SectionStatusStamp({ outcome }: { outcome: SectionOutcome }) {
  const { text } = statusVisual(outcome.variant);
  return (
    <span className="flex flex-col items-center gap-1.5">
      <StatusMark outcome={outcome} className="size-8" />
      <span className={cn('text-center text-[11px] font-semibold leading-tight', text)}>
        {outcome.label}
      </span>
    </span>
  );
}

/** Inline verdict for narrow screens, where a fixed column would starve the findings. */
function SectionStatusChip({ outcome }: { outcome: SectionOutcome }) {
  const { surface, text } = statusVisual(outcome.variant);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-xs font-semibold',
        surface,
        text
      )}
    >
      <StatusMark outcome={outcome} className="size-5 border-0 bg-transparent" />
      {outcome.label}
    </span>
  );
}

function ScopeLine({ sections }: { sections: SectionDef[] }) {
  return (
    <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
      {sections.map((s) => s.label).join(' · ')}
    </p>
  );
}

function IdlePanel({ sections }: { sections: SectionDef[] }) {
  return (
    <div className="flex flex-col items-center px-2 py-8 text-center sm:py-10">
      <div className="from-primary/15 to-primary/5 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br">
        <Sparkles className="size-5" aria-hidden />
      </div>
      <p className="text-foreground text-sm font-semibold">Ready to review</p>
      <ScopeLine sections={sections} />
    </div>
  );
}

/** Varied line lengths per row so the wait doesn't read as a stack of identical bars. */
const PLACEHOLDER_WIDTHS = ['72%', '58%', '81%', '64%', '76%'];

/**
 * The wait is the shape of the answer: the same rows, chips and text lines the
 * results will occupy, with one light sweeping down them. Nothing here claims a
 * section is finished — mid-run polling is unreliable, so there is no progress to
 * report, only that work is moving.
 */
function RunningPanel({ sections }: { sections: SectionDef[] }) {
  return (
    <div
      className="border-border relative overflow-hidden rounded-lg border"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        Checking {sections.map((s) => s.label).join(', ')}. Results appear when the run finishes.
      </span>

      <div className="divide-border divide-y">
        {sections.map((section, index) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="flex">
              <div className="min-w-0 flex-1 px-3.5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <SectionIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                    <h4 className="text-foreground truncate text-sm font-semibold tracking-tight">
                      {section.label}
                    </h4>
                  </div>
                  <span className="bg-muted h-5 w-24 shrink-0 rounded-full sm:hidden" aria-hidden />
                </div>
                <div className="mt-1.5 pl-6 pt-0.5">
                  <span
                    className="bg-muted block h-3.5 rounded-full"
                    style={{ width: PLACEHOLDER_WIDTHS[index % PLACEHOLDER_WIDTHS.length] }}
                    aria-hidden
                  />
                </div>
              </div>
              <div
                className={cn(
                  'border-border bg-muted/30 hidden shrink-0 flex-col items-center justify-center gap-1.5 border-l px-2 py-3.5 sm:flex',
                  STATUS_COLUMN
                )}
              >
                <span className="bg-muted size-8 rounded-full" aria-hidden />
                <span className="bg-muted h-3 w-14 rounded-full" aria-hidden />
              </div>
            </div>
          );
        })}
      </div>

      {/* Beam: trail above, bright edge at the leading (lower) side. */}
      <span
        className="animate-ai-scan pointer-events-none absolute inset-x-0 -top-1/4 h-1/4"
        aria-hidden
      >
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent,hsl(var(--primary)/0.16))]" />
        <span className="bg-primary/45 absolute inset-x-0 bottom-0 h-px" />
      </span>
    </div>
  );
}

function flagDotClasses(severity: BookingAiReviewFlag['severity']): string {
  if (severity === 'blocking') return 'bg-destructive';
  if (severity === 'warning') return 'bg-warning';
  return 'bg-muted-foreground/40';
}

/**
 * AI text with any mention of a stored booking file rendered as a preview link,
 * so a finding can be verified against the document without leaving the modal.
 */
function AiText({
  text,
  refs,
  onPreview,
}: {
  text: string;
  refs: BookingAiDocumentRef[];
  onPreview?: BookingAssetPreviewHandler;
}) {
  if (!onPreview || refs.length === 0) return <>{text}</>;

  return (
    <>
      {linkifyBookingAiText(text, refs).map((segment, idx) =>
        segment.ref ? (
          <button
            key={idx}
            type="button"
            onClick={() => void onPreview(segment.ref!.label, segment.ref!.url)}
            className="text-primary hover:decoration-primary focus-ring decoration-primary/40 rounded font-medium underline decoration-dotted underline-offset-2"
            title={`Preview ${segment.ref.label}`}
          >
            {segment.text}
          </button>
        ) : (
          <span key={idx}>{segment.text}</span>
        )
      )}
    </>
  );
}

function FlagList({
  flags,
  refs,
  onPreview,
}: {
  flags: BookingAiReviewFlag[];
  refs: BookingAiDocumentRef[];
  onPreview?: BookingAssetPreviewHandler;
}) {
  return (
    <ul className="mt-2 space-y-1.5">
      {flags.map((flag, idx) => (
        <li key={idx} className="text-muted-foreground flex gap-2 text-[13px] leading-relaxed">
          <span
            className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', flagDotClasses(flag.severity))}
            aria-hidden
          />
          <span className="min-w-0">
            <AiText text={flag.message} refs={refs} onPreview={onPreview} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SectionResultRow({
  section,
  result,
  status,
  refs,
  onPreview,
}: {
  section: SectionDef;
  result?: BookingAiReviewSectionResult | null;
  status: BookingAiReviewSectionStatus;
  refs: BookingAiDocumentRef[];
  onPreview?: BookingAssetPreviewHandler;
}) {
  const outcome = resolveSectionOutcome(status, result, section.label);
  const displaySummary =
    status === 'failed' || status === 'completed'
      ? sanitizeAiReviewSummary(result?.summary, section.label)
      : result?.summary;
  const displayFlags = sanitizeAiReviewFlags(result?.flags ?? null, section.label);
  const sectionRefs = bookingAiSectionDocumentRefs(section.id, refs);
  const SectionIcon = section.icon;
  const hasBody =
    status === 'skipped' || ((status === 'completed' || status === 'failed') && result);

  return (
    // Verdicts live in their own ruled column so they line up down the list instead
    // of floating at ragged widths above the findings. Too narrow for that on phones,
    // where the verdict rides the title line instead.
    <div className="flex">
      <div className="min-w-0 flex-1 px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <SectionIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <h4 className="text-foreground truncate text-sm font-semibold tracking-tight">
              {section.label}
            </h4>
          </div>
          <span className="sm:hidden">
            <SectionStatusChip outcome={outcome} />
          </span>
        </div>

        {hasBody ? (
          <div className="mt-1.5 pl-6">
            {status === 'skipped' ? (
              <p className="text-muted-foreground text-[13px]">
                Nothing to check for this booking.
              </p>
            ) : (
              <>
                <p className="text-foreground text-sm leading-relaxed">
                  <AiText text={displaySummary ?? ''} refs={sectionRefs} onPreview={onPreview} />
                </p>
                {displayFlags.length > 0 ? (
                  <FlagList flags={displayFlags} refs={sectionRefs} onPreview={onPreview} />
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'border-border bg-muted/30 hidden shrink-0 items-center justify-center border-l px-2 py-3.5 sm:flex',
          STATUS_COLUMN
        )}
      >
        <SectionStatusStamp outcome={outcome} />
      </div>
    </div>
  );
}

type Props = {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Enables in-sentence document links — omit and findings stay plain text. */
  onPreview?: BookingAssetPreviewHandler;
};

export function BookingAiSummaryPanel({ booking, open, onOpenChange, onPreview }: Props) {
  const { data: review } = useBookingAiReview(booking.id);
  const trigger = useBookingAiReviewTrigger(booking.id, () => undefined);

  const isStuck = isStuckProcessingReview(review);
  const isRunning = isBookingAiReviewRunning(review, trigger.isPending);

  const visibleSections = useMemo(() => SECTIONS.filter((s) => !s.optional(booking)), [booking]);
  const documentRefs = useMemo(() => collectBookingAiDocumentRefs(booking), [booking]);

  const sectionStatus = useCallback(
    (row: BookingAiReview | null | undefined, id: SectionId) =>
      (row?.[`${id}_status` as keyof BookingAiReview] as BookingAiReviewSectionStatus) ?? 'pending',
    []
  );

  const sectionResult = useCallback(
    (row: BookingAiReview | null | undefined, id: SectionId) =>
      (row?.[`${id}_result` as keyof BookingAiReview] as
        BookingAiReviewSectionResult | null | undefined) ?? null,
    []
  );

  const hasAnyResult = useMemo(() => {
    if (!review) return false;
    return visibleSections.some((s) => {
      const status = sectionStatus(review, s.id);
      return status === 'completed' || status === 'failed' || status === 'skipped';
    });
  }, [review, visibleSections, sectionStatus]);

  const showResults = hasAnyResult && !isRunning;
  // One run per booking — re-runs burn tokens. Stuck / failed first attempts may retry.
  const canTriggerRun = !isRunning && !showResults;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-ai-summary-title"
        className="border-border bg-card flex max-h-[min(92dvh,calc(100dvh-1.5rem))] w-full max-w-[min(calc(100vw-1.5rem),32rem)] flex-col overflow-hidden rounded-xl border shadow-2xl sm:max-w-[min(calc(100vw-2rem),44rem)]"
      >
        <header className="border-border flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <h3 id="booking-ai-summary-title" className="text-foreground text-lg font-semibold">
              AI Summary
            </h3>
            <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
              AI will review the booking details, documents, and receipts, and highlights anything
              that needs attention.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-5">
          {isStuck && !isRunning ? (
            <div className="border-destructive/25 bg-destructive/10 text-destructive mb-3 rounded-lg border px-3 py-2.5 text-sm">
              Checks did not finish. Try again.
            </div>
          ) : null}

          {isRunning ? (
            <RunningPanel sections={visibleSections} />
          ) : showResults ? (
            <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
              {visibleSections.map((section, index) => (
                // Findings land in the order the scan passed over them, so the wait
                // resolves into the answer instead of swapping for it.
                <div
                  key={section.id}
                  className="motion-safe:animate-fade-up motion-safe:[animation-fill-mode:backwards]"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <SectionResultRow
                    section={section}
                    status={sectionStatus(review, section.id)}
                    result={sectionResult(review, section.id)}
                    refs={documentRefs}
                    onPreview={onPreview}
                  />
                </div>
              ))}
            </div>
          ) : (
            <IdlePanel sections={visibleSections} />
          )}
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3 sm:px-5">
          {showResults ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-muted focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border bg-transparent text-sm font-semibold transition-colors motion-safe:active:scale-[0.98]"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => trigger.mutate()}
              disabled={!canTriggerRun}
              aria-busy={isRunning || undefined}
              className={cn(
                'relative inline-flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-bold transition-all duration-200 motion-safe:active:scale-[0.98]',
                isRunning
                  ? // Indeterminate track instead of a second spinner: the list is already
                    // saying work is happening, so the action only has to look occupied.
                    'border-border bg-muted/50 text-muted-foreground cursor-default border font-semibold'
                  : 'disabled:opacity-50',
                !isRunning &&
                  (isStuck
                    ? 'border-border text-foreground hover:bg-muted border bg-transparent font-medium'
                    : 'gradient-primary text-primary-foreground shadow-soft hover:shadow-primary-glow hover:brightness-[1.03]')
              )}
            >
              {isRunning ? (
                <>
                  <span
                    className="animate-meta-sync-slide via-primary/30 absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent to-transparent"
                    aria-hidden
                  />
                  <span className="relative">Checking…</span>
                </>
              ) : isStuck ? (
                'Try again'
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  Run checks
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
