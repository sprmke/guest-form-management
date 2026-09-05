import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';

import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import {
  useApplySmartPricing,
  useClearSmartPricing,
  usePreviewSmartPricing,
  useSaveSmartPricingSettings,
  useSmartPricingSettings,
} from '@/features/dashboard/pricing/hooks/useSmartPricing';
import {
  STRATEGY_OPTIONS,
  type SmartPricingDiffRow,
  type SmartPricingMode,
  type SmartPricingPreview,
  type SmartPricingSettingsPatch,
} from '@/features/dashboard/pricing/lib/smartPricingApi';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Switch } from '@/components/ui/switch';
import { SegmentedStepProgress } from '@/components/wizard/SegmentedStepProgress';
import { cn } from '@/lib/utils';

// ── formatting ────────────────────────────────────────────────────────────────
const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});
const peso = (n: number) => PESO.format(Math.round(n));
/** Compact ₱ for calendar cells: ₱3.9k / ₱950. */
function pesoCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `₱${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return `₱${Math.round(n)}`;
}
const round50 = (n: number) => Math.max(0, Math.round(n / 50) * 50);

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STEP_LABELS = ['Settings', 'Preview'] as const;

type Tone = 'up' | 'same' | 'down';
function toneOf(baseRate: number, rate: number): Tone {
  if (baseRate <= 0) return 'same';
  const d = (rate - baseRate) / baseRate;
  if (d > 0.015) return 'up';
  if (d < -0.015) return 'down';
  return 'same';
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** No `pricing.rates:edit` permission — view-only. */
  readOnly?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview — headline + month calendar + plain reasons
// ─────────────────────────────────────────────────────────────────────────────

type Reason = { text: string; tone: Tone | 'note' };

function buildReasons(diff: SmartPricingDiffRow[], preview: SmartPricingPreview): Reason[] {
  const changed = diff.filter((r) => r.recommendedRate !== r.baseRate);
  const out: Reason[] = [];

  // Weekend nights that aren't already covered by a holiday/season rule.
  const weekends = changed.filter(
    (r) =>
      (r.weekday === 0 || r.weekday === 5 || r.weekday === 6) &&
      !r.factors.some((f) => f.key === 'season_rule')
  );
  if (weekends.length >= 3) {
    const avg = round50(
      weekends.reduce((s, r) => s + (r.recommendedRate - r.baseRate), 0) / weekends.length
    );
    if (Math.abs(avg) >= 50) {
      out.push({
        text: `Weekends about ${peso(Math.abs(avg))} ${avg > 0 ? 'higher' : 'lower'} than weekdays`,
        tone: avg > 0 ? 'up' : 'down',
      });
    }
  }

  const byRule = new Map<string, number[]>();
  for (const r of changed) {
    const f = r.factors.find((x) => x.key === 'season_rule');
    if (!f) continue;
    const arr = byRule.get(f.label) ?? [];
    arr.push(r.recommendedRate - r.baseRate);
    byRule.set(f.label, arr);
  }
  for (const [label, deltas] of [...byRule.entries()].slice(0, 2)) {
    const avg = round50(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    if (Math.abs(avg) < 50) continue;
    out.push({
      text: `${label}: ${peso(Math.abs(avg))} ${avg > 0 ? 'higher' : 'lower'} — your saved ${avg > 0 ? 'holiday' : 'season'} rate`,
      tone: avg > 0 ? 'up' : 'down',
    });
  }

  const orphans = changed.filter((r) => r.factors.some((f) => f.key === 'orphan'));
  if (orphans.length) {
    out.push({
      text: `${orphans.length} gap night${orphans.length > 1 ? 's' : ''} discounted — short gaps between bookings are hard to fill`,
      tone: 'down',
    });
  }

  const lastMinute = changed.filter((r) => r.factors.some((f) => f.key === 'lead_time'));
  if (lastMinute.length >= 2) {
    out.push({
      text: `The next ${lastMinute.length} open dates nudged down for last-minute bookings`,
      tone: 'down',
    });
  }

  if (out.length === 0 && changed.length > 0) {
    out.push({
      text: `Small changes across ${changed.length} nights to match how your dates usually book`,
      tone: 'note',
    });
  }

  for (const w of preview.ai?.warnings ?? []) out.push({ text: w, tone: 'note' });

  return out.slice(0, 5);
}

function verdict(preview: SmartPricingPreview, isNew: boolean): { chip: string; line: string } {
  const changed = preview.diff.filter((r) => r.recommendedRate !== r.baseRate).length;
  if (changed === 0) {
    return {
      chip: 'no change',
      line: 'Your prices already match how your dates book — nothing to adjust right now.',
    };
  }
  const cur = round50(preview.next30.currentTotal);
  const sm = round50(preview.next30.smartTotal);
  const diff = sm - cur;
  const pct = cur > 0 ? diff / cur : 0;

  if (isNew) {
    return {
      chip: 'gentle start',
      line: 'Your listing is still new, so these are small, safe moves off your own weekend and holiday rates. It gets sharper as bookings come in.',
    };
  }
  if (Math.abs(pct) < 0.03) {
    return {
      chip: 'about the same',
      line: 'About the same over the month — each night is just tuned to its own date.',
    };
  }
  if (diff > 0) {
    return {
      chip: 'a bit more',
      line: `About ${peso(diff)} more over the month, weighted toward the dates most likely to book.`,
    };
  }
  return {
    chip: 'a bit less',
    line: `About ${peso(-diff)} less over the month — the trade for filling quiet and last-minute dates.`,
  };
}

function MiniCalendar({ diff }: { diff: SmartPricingDiffRow[] }) {
  const byMonth = useMemo(() => {
    const map = new Map<string, SmartPricingDiffRow[]>();
    for (const r of diff) {
      const key = r.date.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [diff]);

  // Open on the first month that actually has a change — that's what the host came to see.
  const firstChangedIdx = useMemo(() => {
    const i = byMonth.findIndex(([, rows]) => rows.some((r) => r.recommendedRate !== r.baseRate));
    return i === -1 ? 0 : i;
  }, [byMonth]);
  const [idx, setIdx] = useState(firstChangedIdx);
  useEffect(() => {
    setIdx(firstChangedIdx);
  }, [firstChangedIdx]);
  if (byMonth.length === 0) return null;

  const safeIdx = Math.min(idx, byMonth.length - 1);
  const [monthKey, rows] = byMonth[safeIdx]!;
  const [year, month] = monthKey.split('-').map(Number);
  const byDay = new Map(rows.map((r) => [Number(r.date.slice(8, 10)), r]));

  const firstDow = new Date(Date.UTC(year!, month! - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={safeIdx === 0}
          onClick={() => setIdx(safeIdx - 1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[month! - 1]} {year}
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={safeIdx === byMonth.length - 1}
          onClick={() => setIdx(safeIdx + 1)}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px px-2 pb-1">
        {DOW_LETTERS.map((d, i) => (
          <div key={i} className="text-muted-foreground pb-1 text-center text-[10px] font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-2 pb-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const row = byDay.get(day);
          if (!row) {
            return (
              <div
                key={i}
                className="bg-muted/30 text-muted-foreground/40 flex h-14 flex-col items-center justify-center rounded-md text-[11px]"
              >
                {day}
              </div>
            );
          }
          const tone = toneOf(row.baseRate, row.recommendedRate);
          return (
            <div
              key={i}
              title={`${MONTHS[month! - 1]} ${day} · ${peso(row.recommendedRate)}${
                tone !== 'same' ? ` (was ${peso(row.baseRate)})` : ''
              }`}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] leading-none',
                tone === 'up' &&
                  'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
                tone === 'down' &&
                  'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
                tone === 'same' && 'bg-muted/60 text-foreground'
              )}
            >
              <span className="text-[11px] font-medium">{day}</span>
              {tone !== 'same' ? (
                <span className="line-through opacity-60">{pesoCompact(row.baseRate)}</span>
              ) : null}
              <span className="font-semibold tabular-nums">{pesoCompact(row.recommendedRate)}</span>
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-t px-3 py-2 text-[11px]">
        <Legend className="bg-emerald-400" label="higher" />
        <Legend className="bg-muted-foreground/40" label="same" />
        <Legend className="bg-amber-400" label="lower" />
        <Legend className="bg-muted-foreground/15" label="booked / blocked" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('size-2 rounded-[3px]', className)} />
      {label}
    </span>
  );
}

function PreviewBody({
  preview,
  isNew,
  mode,
}: {
  preview: SmartPricingPreview;
  isNew: boolean;
  mode: SmartPricingMode;
}) {
  const reasons = useMemo(() => buildReasons(preview.diff, preview), [preview]);
  const v = verdict(preview, isNew);
  const cur = round50(preview.next30.currentTotal);
  const sm = round50(preview.next30.smartTotal);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4">
        <div className="text-muted-foreground text-xs">
          Your next {preview.next30.nights} open nights
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-muted-foreground text-sm line-through">{peso(cur)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-2xl font-semibold tabular-nums">{peso(sm)}</span>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
            {v.chip}
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{v.line}</p>
        {mode === 'autopilot' ? (
          <p className="text-primary mt-2 text-xs leading-relaxed">
            Automatic updates are on — this applies tonight on its own. Tap{' '}
            <strong className="font-semibold">Apply now</strong> below if you don't want to wait.
          </p>
        ) : null}
      </div>

      <MiniCalendar diff={preview.diff} />

      {reasons.length ? (
        <div className="space-y-1.5">
          <div className="text-sm font-medium">Why these prices</div>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span
                  className={cn(
                    'mt-1 size-1.5 shrink-0 rounded-full',
                    r.tone === 'up' && 'bg-emerald-500',
                    r.tone === 'down' && 'bg-amber-500',
                    r.tone === 'note' && 'bg-muted-foreground/40'
                  )}
                  aria-hidden
                />
                <span className="text-muted-foreground">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export function SmartPricingDialog({ open, onOpenChange, readOnly }: Props) {
  const gate = useFeatureGate('smartPricing');
  const canWrite = !readOnly && gate.canUse;

  const { data, isLoading } = useSmartPricingSettings({ enabled: open });
  const saveMut = useSaveSmartPricingSettings();
  const previewMut = usePreviewSmartPricing();
  const applyMut = useApplySmartPricing();
  const clearMut = useClearSmartPricing();

  const s = data?.settings;
  const preview = previewMut.data;
  const isNew = data?.history?.confidence === 'low';
  const busy =
    saveMut.isPending || previewMut.isPending || applyMut.isPending || clearMut.isPending;
  const hasApplied = (data?.appliedCount ?? 0) > 0 && !clearMut.isSuccess;

  const [floorInput, setFloorInput] = useState('');
  const [ceilInput, setCeilInput] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);
  const seededFrom = useRef<string | null>(null);
  const autoSeeded = useRef(false);

  // Anchored on the weekday base — a little downside protection, more upside room.
  const weekdayBase = data?.resolvedBase.weekday ?? 0;
  const suggestedFloor = weekdayBase ? round50(weekdayBase * 0.9) : 0;
  const suggestedCeiling = weekdayBase ? round50(weekdayBase * 1.25) : 0;

  // Sync local inputs from the server row once per distinct value.
  useEffect(() => {
    if (!open || !data) return;
    const key = `${data.settings.minPrice ?? ''}|${data.settings.maxPrice ?? ''}`;
    if (seededFrom.current === key) return;
    seededFrom.current = key;
    setFloorInput(data.settings.minPrice != null ? String(data.settings.minPrice) : '');
    setCeilInput(data.settings.maxPrice != null ? String(data.settings.maxPrice) : '');
  }, [open, data]);

  useEffect(() => {
    if (!open) {
      previewMut.reset();
      clearMut.reset();
      seededFrom.current = null;
      autoSeeded.current = false;
      setConfirmOff(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (fields: SmartPricingSettingsPatch) => {
    if (!canWrite) return;
    saveMut.mutate(fields);
  };

  // Seed sensible price limits the moment Smart Pricing is switched on with none set.
  useEffect(() => {
    if (!open || autoSeeded.current || !canWrite || !s?.enabled || saveMut.isPending) return;
    const seed: SmartPricingSettingsPatch = {};
    if (s.minPrice == null && suggestedFloor > 0) seed.minPrice = suggestedFloor;
    if (s.maxPrice == null && suggestedCeiling > 0) seed.maxPrice = suggestedCeiling;
    if (Object.keys(seed).length === 0) return;
    autoSeeded.current = true;
    if (seed.minPrice != null) setFloorInput(String(seed.minPrice));
    if (seed.maxPrice != null) setCeilInput(String(seed.maxPrice));
    saveMut.mutate(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, s?.enabled, s?.minPrice, s?.maxPrice, suggestedFloor, suggestedCeiling, canWrite]);

  const commitFloor = () => {
    const raw = floorInput.trim();
    const n = raw === '' ? suggestedFloor : Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if (raw === '') setFloorInput(n > 0 ? String(n) : '');
    if (n !== (s?.minPrice ?? null)) patch({ minPrice: n > 0 ? n : null });
  };
  const commitCeil = () => {
    const raw = ceilInput.trim();
    const n = raw === '' ? null : Number(raw);
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return;
    if (n !== (s?.maxPrice ?? null)) patch({ maxPrice: n });
  };

  const strategy =
    STRATEGY_OPTIONS.find((o) => o.value === s?.aggressiveness) ?? STRATEGY_OPTIONS[1];

  const modeBlurb =
    s?.mode === 'autopilot'
      ? 'Smart Pricing updates your prices on its own, every night. Come back anytime to review or switch back.'
      : "You'll see a preview and tap Apply — nothing changes until you approve it.";

  const previewChanged = preview
    ? preview.diff.filter((r) => r.recommendedRate !== r.baseRate).length > 0
    : false;

  const view: 'loading' | 'intro' | 'settings' | 'preview' =
    isLoading || !s ? 'loading' : preview ? 'preview' : s.enabled ? 'settings' : 'intro';

  const confirmDisable = () => {
    patch({ enabled: false });
    clearMut.mutate();
    setConfirmOff(false);
  };

  const blockDismiss = (event: { preventDefault: () => void }) => {
    if (confirmOff) event.preventDefault();
  };

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && confirmOff) return;
          onOpenChange(next);
        }}
      >
        <ResponsiveModalContent
          sheetLayout="split"
          className="flex max-h-[min(92dvh,760px)] max-w-[min(calc(100vw-1.5rem),42rem)] flex-col overflow-hidden sm:max-w-[min(95vw,42rem)]"
          onPointerDownOutside={blockDismiss}
          onInteractOutside={blockDismiss}
          onFocusOutside={blockDismiss}
          onEscapeKeyDown={blockDismiss}
        >
          <ResponsiveModalHeader className="shrink-0 max-lg:px-4">
            <ResponsiveModalTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-4" aria-hidden />
              Smart Pricing
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Fine-tunes your nightly prices so more dates get booked — you stay in control.
            </ResponsiveModalDescription>
            {view === 'settings' || view === 'preview' ? (
              <div className="pt-3">
                <SegmentedStepProgress
                  labels={STEP_LABELS}
                  currentIndex={view === 'preview' ? 1 : 0}
                />
              </div>
            ) : null}
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-1 max-lg:px-4">
            {!canWrite ? (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {readOnly
                  ? 'You can view Smart Pricing but need the pricing-rates permission to change it.'
                  : 'Smart Pricing is a Pro-plan feature. Turning it on opens the upgrade options.'}
              </div>
            ) : null}

            {view === 'loading' ? (
              <div className="text-muted-foreground flex items-center justify-center py-16">
                <Loader2 className="size-5 animate-spin" aria-hidden />
              </div>
            ) : view === 'preview' ? (
              <PreviewBody preview={preview!} isNew={isNew} mode={s!.mode} />
            ) : view === 'intro' ? (
              <div className="space-y-5 py-1">
                <ul className="space-y-3 text-sm">
                  <IntroRow>Weekends and holidays priced a little higher</IntroRow>
                  <IntroRow>Quiet and last-minute dates nudged down to fill</IntroRow>
                  <IntroRow>Never goes below the price floor you set</IntroRow>
                </ul>
                <p className="text-muted-foreground text-xs">
                  Nothing changes until you preview and approve it.
                </p>
              </div>
            ) : (
              // ── settings ───────────────────────────────────────────────────
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Smart Pricing is on</div>
                    <div className="text-muted-foreground text-xs">
                      {hasApplied
                        ? `${data!.appliedCount} night${data!.appliedCount === 1 ? '' : 's'} priced`
                        : 'Preview to see what it suggests.'}
                    </div>
                  </div>
                  <Switch
                    checked={s!.enabled}
                    disabled={!canWrite || busy}
                    onCheckedChange={(v) => (v ? patch({ enabled: true }) : setConfirmOff(true))}
                    aria-label="Turn Smart Pricing off"
                  />
                </div>

                {isNew ? (
                  <p className="bg-muted/50 text-muted-foreground rounded-lg px-3 py-2 text-xs leading-relaxed">
                    New listing — for now Smart Pricing makes only small, safe changes and gets
                    sharper as bookings come in.
                  </p>
                ) : null}

                <div className="space-y-2">
                  <div className="text-sm font-medium">How bold should changes be?</div>
                  <div className="grid grid-cols-3 gap-2">
                    {STRATEGY_OPTIONS.map((opt) => {
                      const active = s!.aggressiveness === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!canWrite}
                          onClick={() => patch({ aggressiveness: opt.value })}
                          className={cn(
                            'rounded-lg border px-2 py-2 text-center transition-colors',
                            active
                              ? 'border-primary bg-primary/5 ring-primary/30 ring-1'
                              : 'hover:bg-accent'
                          )}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-muted-foreground mt-0.5 text-[11px]">
                            {opt.range}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {strategy.blurb}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Price limits</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Never below</span>
                      <span className="relative">
                        <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                          ₱
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-9 w-28 pl-5"
                          disabled={!canWrite}
                          value={floorInput}
                          placeholder={suggestedFloor ? String(suggestedFloor) : ''}
                          onChange={(e) => setFloorInput(e.target.value)}
                          onBlur={commitFloor}
                        />
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Never above</span>
                      <span className="relative">
                        <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                          ₱
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-9 w-28 pl-5"
                          disabled={!canWrite}
                          value={ceilInput}
                          placeholder={suggestedCeiling ? String(suggestedCeiling) : 'no limit'}
                          onChange={(e) => setCeilInput(e.target.value)}
                          onBlur={commitCeil}
                        />
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Prices update</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['review_only', 'When I approve'],
                        ['autopilot', 'Automatically'],
                      ] as const
                    ).map(([value, label]) => {
                      const active = s!.mode === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={!canWrite}
                          onClick={() =>
                            patch({ mode: value, aiRationaleEnabled: value === 'autopilot' })
                          }
                          className={cn(
                            'rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary/5 ring-primary/30 ring-1'
                              : 'hover:bg-accent'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{modeBlurb}</p>
                </div>
              </div>
            )}
          </div>

          {view === 'loading' ? null : (
            <ResponsiveModalFooter
              className={cn(
                'shrink-0 max-lg:px-4',
                view === 'preview' && previewChanged ? 'sm:justify-between' : undefined
              )}
            >
              {view === 'intro' ? (
                <Button
                  type="button"
                  className="min-h-[44px] sm:min-h-10"
                  disabled={!canWrite || busy}
                  onClick={() => patch({ enabled: true })}
                >
                  {saveMut.isPending ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                  ) : null}
                  Turn on Smart Pricing
                </Button>
              ) : view === 'settings' ? (
                <Button
                  type="button"
                  className="min-h-[44px] gap-1.5 sm:min-h-10"
                  disabled={!canWrite || busy}
                  onClick={() => previewMut.mutate({ explain: true })}
                >
                  {previewMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="size-4" aria-hidden />
                  )}
                  {hasApplied ? 'See updated prices' : 'Preview my prices'}
                </Button>
              ) : previewChanged ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] gap-1.5 sm:min-h-10"
                    onClick={() => previewMut.reset()}
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] sm:min-h-10"
                    disabled={!canWrite || applyMut.isPending}
                    onClick={() =>
                      applyMut.mutate(
                        { runId: preview!.runId },
                        { onSuccess: () => onOpenChange(false) }
                      )
                    }
                  >
                    {applyMut.isPending ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                    ) : null}
                    {s!.mode === 'autopilot' ? 'Apply now' : 'Apply all'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] gap-1.5 sm:min-h-10"
                  onClick={() => previewMut.reset()}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
              )}
            </ResponsiveModalFooter>
          )}
        </ResponsiveModalContent>
      </ResponsiveModal>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent className="max-w-[min(calc(100vw-1.5rem),26rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off Smart Pricing?</AlertDialogTitle>
            <AlertDialogDescription>
              This resets your prices back to your saved rates and clears the current suggestions.
              You can turn it back on anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable}>Turn off</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IntroRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="bg-primary/10 text-primary mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
        <Sparkles className="size-3" aria-hidden />
      </span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
