import * as React from 'react';
import {
  Activity,
  ChevronDown,
  Clock,
  Megaphone,
  Plus,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTelegramMarketingSettings,
  useTelegramMarketingTestSend,
  useUpdateTelegramMarketingSettings,
  type TelegramEnvVerifyDto,
  type TelegramMarketingSettingsDto,
  type ManilaReminderSlot,
} from '@/features/admin/hooks/useTelegramMarketingSettings';
import { getManilaYmdToday, getManilaYmdTomorrow } from '@/utils/dates';

function CheckboxRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 items-start min-h-[44px] py-1.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-[18px] shrink-0 rounded border border-input accent-primary"
      />
      <div className="min-w-0 space-y-0.5">
        <label
          htmlFor={id}
          className="text-ui font-medium text-foreground cursor-pointer leading-snug"
        >
          {label}
        </label>
        <p className="text-caption leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  defaultOpen,
  triggerTitle,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  /** Native tooltip / SR context for the trigger (keeps UI minimal). */
  triggerTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group rounded-2xl border border-border/50 bg-muted/30"
    >
      <CollapsibleTrigger
        type="button"
        title={triggerTitle}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
          'text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:py-2',
        )}
        aria-controls={`${id}-panel`}
      >
        <span className="min-w-0 flex-1 text-sm font-semibold">{title}</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          id={`${id}-panel`}
          className="space-y-3 border-t border-border/70 px-3 pb-3 pt-3 sm:space-y-4"
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TemplateField({
  id,
  label,
  value,
  onChange,
  disabled,
  onSendDraft,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onSendDraft: () => void;
}) {
  const inputId = `${id}-textarea`;
  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border border-border/80 bg-background/80 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-2 sm:p-3 sm:items-start">
      <Label
        htmlFor={inputId}
        className="min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-start-1 sm:row-start-1 sm:self-center sm:text-[11px]"
      >
        {label}
      </Label>
      <Textarea
        id={inputId}
        disabled={disabled}
        rows={3}
        className="col-span-full min-h-[88px] min-w-0 w-full resize-y text-sm sm:col-span-2 sm:row-start-2 sm:text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="min-h-[44px] w-full min-w-0 sm:col-start-2 sm:row-start-1 sm:h-9 sm:w-auto sm:min-h-9 sm:shrink-0 sm:justify-self-end sm:self-center"
        title="Sends a test message with live calendar data."
        onClick={() => onSendDraft()}
      >
        Send preview
      </Button>
    </div>
  );
}

type DailyTestResult = {
  sent?: boolean;
  mode?: string;
  detail?: string;
  defaultSent?: boolean;
  urgencySent?: boolean;
  daysOut?: number;
  urgencyThreshold?: number;
  earliestCheckInYmd?: string | null;
};
type NotifyTestResult = {
  sent?: boolean;
  skip?: string;
  telegramError?: string;
};

function slotSort(a: ManilaReminderSlot, b: ManilaReminderSlot): number {
  return a.hour * 60 + a.minute - (b.hour * 60 + b.minute);
}

/** `type="time"` value (`HH:mm`, 24h). */
function slotToTimeInputValue(slot: ManilaReminderSlot): string {
  return `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
}

function timeInputValueToSlot(value: string): ManilaReminderSlot | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function formatManilaTimeLabel(slot: ManilaReminderSlot): string {
  const d = new Date(2000, 0, 1, slot.hour, slot.minute);
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function sortedSlotLabels(slots: ManilaReminderSlot[]): string {
  return [...slots].sort(slotSort).map(formatManilaTimeLabel).join(', ');
}

function sanitizeSlots(slots: ManilaReminderSlot[]): ManilaReminderSlot[] {
  const mapped = slots.map((s) => ({
    hour: Math.max(0, Math.min(23, Math.round(s.hour))),
    minute: Math.max(0, Math.min(59, Math.round(s.minute))),
  }));
  const seen = new Set<number>();
  const out: ManilaReminderSlot[] = [];
  for (const s of [...mapped].sort(slotSort)) {
    const k = s.hour * 60 + s.minute;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.length > 0 ? out : [{ hour: 10, minute: 0 }];
}

export function TelegramMarketingSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramMarketingSettings();
  const update = useUpdateTelegramMarketingSettings();
  const testSend = useTelegramMarketingTestSend();

  const [draft, setDraft] = React.useState<TelegramMarketingSettingsDto | null>(
    null,
  );
  const [testCancelCheckIn, setTestCancelCheckIn] =
    React.useState(getManilaYmdToday);
  const [testCancelCheckOut, setTestCancelCheckOut] =
    React.useState(getManilaYmdTomorrow);

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const busy = isLoading || update.isPending || testSend.isPending;

  const onSave = () => {
    if (!draft) return;
    update.mutate(
      {
        enabled: draft.enabled,
        notifyOnNewBooking: draft.notifyOnNewBooking,
        notifyOnCancellation: draft.notifyOnCancellation,
        urgencyDaysThreshold: draft.urgencyDaysThreshold,
        newBookingDatesLimit: draft.newBookingDatesLimit,
        dailyReminderTimesManila: sanitizeSlots(draft.dailyReminderTimesManila),
        dailyDefaultTemplate: draft.dailyDefaultTemplate,
        dailyUrgencyTemplate: draft.dailyUrgencyTemplate,
        newBookingTemplate: draft.newBookingTemplate,
        cancellationTemplate: draft.cancellationTemplate,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success('Marketing settings saved');
          if (cronSync && cronSync.ok !== true) {
            toast.error(
              cronSync.error ??
                'Schedule could not be updated. Settings were still saved.',
            );
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const runDraftPreview = (text: string, label: string) => {
    if (/\{\{cancellation_dates\}\}/.test(text)) {
      if (!testCancelCheckIn || !testCancelCheckOut) {
        toast.error(
          'Set check-in and check-out in the cancellation date fields (Test actions).',
        );
        return;
      }
      if (testCancelCheckIn >= testCancelCheckOut) {
        toast.error('Check-out must be after check-in.');
        return;
      }
    }
    testSend.mutate(
      {
        action: 'send_draft_preview',
        text,
        checkInYmd: testCancelCheckIn,
        checkOutYmd: testCancelCheckOut,
      },
      {
        onSuccess: (j) => {
          toast.success(
            `${label}: sent with live calendar data (${j.messageCharCount ?? '?'} characters)`,
          );
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  if (isError) {
    return (
      <section
        className="w-full rounded-xl border border-destructive/40 bg-card px-3 py-3 sm:px-4 sm:py-3.5"
        aria-labelledby="telegram-marketing-heading"
      >
        <p className="text-sm text-destructive">
          {(error as Error).message ?? 'Failed to load Telegram settings'}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return (
      <section
        className="w-full surface-card px-3 py-3 sm:px-4 sm:py-3.5 animate-pulse"
        aria-labelledby="telegram-marketing-heading"
      >
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-3 h-24 rounded bg-muted" />
      </section>
    );
  }

  return (
    <section
      className={cn('surface-card w-full px-3 py-3 sm:px-4 sm:py-4')}
      aria-labelledby="telegram-marketing-heading"
    >
      <div className="space-y-4">
        <AdminPageHeader
          id="telegram-marketing-heading"
          title="Marketing"
          subtitle="Telegram reminders for your marketing group. Save when you're done editing."
          icon={Megaphone}
        />

        <div className="space-y-3">
          <CollapsibleSection
            id="tg-tests"
            title="Test Sends"
            defaultOpen
            triggerTitle="Test messages. On/off toggles are ignored."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    { action: 'verify_telegram_env' },
                    {
                      onSuccess: (j) => {
                        const v = j.verify as TelegramEnvVerifyDto | undefined;
                        if (!v) {
                          toast.error('No verify payload from server');
                          return;
                        }
                        const parts: string[] = [];
                        if (v.credentials.normalizeError) {
                          parts.push(v.credentials.normalizeError);
                        } else {
                          const lead = v.credentials.rawLeadingCodePoint;
                          const minusHint =
                            v.credentials.normalizedStartsWithAsciiMinus ===
                              false &&
                            (v.credentials.normalizedChatId?.length ?? 0) > 3
                              ? ' (supergroup ids often start -100; secret first char should be ASCII `-`, codepoint 45—not 8722)'
                              : '';
                          parts.push(
                            `chat_id=${v.credentials.normalizedChatId ?? 'n/a'} (raw chars: ${v.credentials.chatIdRawLength}${
                              lead != null ? `, first codepoint: ${lead}` : ''
                            })${minusHint}`,
                          );
                        }
                        parts.push(
                          v.getMe.ok
                            ? `getMe ok @${v.getMe.username ?? '?'}`
                            : `getMe: ${v.getMe.error ?? 'failed'}`,
                        );
                        parts.push(
                          v.getChat.ok
                            ? `getChat ok: ${v.getChat.type ?? '?'} "${v.getChat.title ?? v.getChat.username ?? 'private'}"`
                            : `getChat: ${v.getChat.error ?? 'failed'}`,
                        );
                        toast.message('Telegram diagnostics', {
                          description: parts.join(' · '),
                          duration: 14_000,
                        });
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                <Activity className="size-4 shrink-0" aria-hidden />
                Verify bot
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    { action: 'send_test_daily_reminder' },
                    {
                      onSuccess: (j) => {
                        const r = j.result as DailyTestResult | undefined;
                        if (r?.sent) {
                          const parts = [
                            `mode=${r.mode ?? '?'}`,
                            r.defaultSent ? 'default ✓' : 'default ✗',
                            r.urgencySent ? 'urgency ✓' : 'urgency ✗',
                          ];
                          if (r.daysOut != null) {
                            parts.push(`next free check-in in ${r.daysOut}d`);
                          }
                          toast.success(
                            `Daily reminder sent (${parts.join(', ')})`,
                          );
                        } else {
                          toast.error(
                            r?.detail ??
                              `Daily reminder not sent (${r?.mode ?? 'unknown'}). Check Edge logs, TELEGRAM_* secrets, and TELEGRAM_CRON_SECRET vs Vault telegram_cron_secret.`,
                          );
                        }
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                Daily reminder
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    { action: 'send_test_daily_urgency' },
                    {
                      onSuccess: (j) => {
                        const r = j.result as DailyTestResult | undefined;
                        if (r?.sent) {
                          const parts = ['Daily urgency sent'];
                          if (r.daysOut != null) {
                            parts.push(
                              `next free check-in in ${r.daysOut}d (threshold ${r.urgencyThreshold ?? '?'})`,
                            );
                          }
                          toast.success(parts.join(' · '));
                        } else {
                          toast.error(
                            r?.detail ??
                              `Daily urgency not sent (${r?.mode ?? 'unknown'}). Check Edge logs and TELEGRAM_* secrets.`,
                          );
                        }
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                Daily urgency
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    { action: 'send_test_new_booking' },
                    {
                      onSuccess: (j) => {
                        const r = j.result as NotifyTestResult | undefined;
                        if (r?.sent) toast.success('New booking test sent');
                        else if (r?.skip === 'no_dates') {
                          toast.error(
                            'No free check-in dates left this month.',
                          );
                        } else {
                          toast.error(
                            r?.telegramError ??
                              `Skipped (${r?.skip ?? 'unknown'})`,
                          );
                        }
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                New booking
              </Button>
            </div>

            <div className="space-y-2 rounded-md border border-border/80 bg-background/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Zap
                  className="size-4 text-amber-600 dark:text-amber-500 shrink-0"
                  aria-hidden
                />
                <p className="text-xs font-semibold text-foreground">
                  Cancellation test dates
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                For{' '}
                <span className="font-mono text-[11px]">
                  {'{{cancellation_dates}}'}
                </span>{' '}
                on preview and cancellation tests. Other placeholders use live
                calendar data.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="tg-test-ci" className="text-xs">
                    Check-in
                  </Label>
                  <Input
                    id="tg-test-ci"
                    type="date"
                    disabled={busy}
                    className="h-10 w-full min-w-0"
                    value={testCancelCheckIn}
                    onChange={(e) => setTestCancelCheckIn(e.target.value)}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="tg-test-co" className="text-xs">
                    Check-out
                  </Label>
                  <Input
                    id="tg-test-co"
                    type="date"
                    disabled={busy}
                    className="h-10 w-full min-w-0"
                    value={testCancelCheckOut}
                    onChange={(e) => setTestCancelCheckOut(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                title="Requires check-in and check-out (Manila). Defaults: today / tomorrow."
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() => {
                  if (!testCancelCheckIn || !testCancelCheckOut) {
                    toast.error('Set check-in and check-out dates.');
                    return;
                  }
                  if (testCancelCheckIn >= testCancelCheckOut) {
                    toast.error('Check-out must be after check-in.');
                    return;
                  }
                  testSend.mutate(
                    {
                      action: 'send_test_cancellation',
                      checkInYmd: testCancelCheckIn,
                      checkOutYmd: testCancelCheckOut,
                    },
                    {
                      onSuccess: (j) => {
                        const r = j.result as NotifyTestResult | undefined;
                        const used = j.usedDates as
                          | { checkInYmd?: string; checkOutYmd?: string }
                          | undefined;
                        if (r?.sent) {
                          toast.success(
                            `Cancellation sent (${used?.checkInYmd ?? '?'} → ${used?.checkOutYmd ?? '?'})`,
                          );
                        } else {
                          toast.error(
                            r?.telegramError ??
                              `Skipped (${r?.skip ?? 'unknown'})`,
                          );
                        }
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  );
                }}
              >
                Send Cancellation
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="tg-placeholders" title="Placeholders">
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 sm:text-[13px]">
              {draft.placeholdersReference.map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection id="tg-auto" title="Schedule & Alerts">
            <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 space-y-1">
              <CheckboxRow
                id="tg-enabled"
                label="Enable Telegram sends"
                description="Off skips scheduled and booking alerts."
                checked={draft.enabled}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, enabled: v } : d))
                }
              />
              <CheckboxRow
                id="tg-new"
                label="New Booking Request"
                description="When a guest submits a new booking."
                checked={draft.notifyOnNewBooking}
                disabled={busy || !draft.enabled}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, notifyOnNewBooking: v } : d))
                }
              />
              <CheckboxRow
                id="tg-cancel"
                label="Cancellation"
                description="When a booking is cancelled in admin."
                checked={draft.notifyOnCancellation}
                disabled={busy || !draft.enabled}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, notifyOnCancellation: v } : d))
                }
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:p-4">
              <div className="flex gap-2.5">
                <Clock
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Daily reminder times
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    When posts go to Telegram (Manila time). Each run sends the
                    daily default message; urgent stays also send the urgency
                    template. Saving updates the schedule.
                  </p>
                </div>
              </div>

              {draft.dailyReminderTimesManila.length > 0 ? (
                <p
                  className="rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  <span className="font-medium text-foreground">
                    Schedule:{' '}
                  </span>
                  {sortedSlotLabels(draft.dailyReminderTimesManila)}
                </p>
              ) : null}

              <ul className="space-y-2">
                {draft.dailyReminderTimesManila.map((slot, idx) => (
                  <li
                    key={`${slot.hour}-${slot.minute}-${idx}`}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <Label
                      htmlFor={`tg-slot-time-${idx}`}
                      className="w-16 shrink-0 text-xs text-muted-foreground sm:w-20 sm:text-sm"
                    >
                      {draft.dailyReminderTimesManila.length === 1
                        ? 'Time'
                        : `#${idx + 1}`}
                    </Label>
                    <Input
                      id={`tg-slot-time-${idx}`}
                      type="time"
                      disabled={busy}
                      value={slotToTimeInputValue(slot)}
                      className="h-10 min-h-[44px] min-w-0 flex-1 max-w-[11rem] text-base sm:text-sm"
                      onChange={(e) => {
                        const parsed = timeInputValueToSlot(e.target.value);
                        if (!parsed) return;
                        setDraft((d) => {
                          if (!d) return d;
                          const next = [...d.dailyReminderTimesManila];
                          next[idx] = parsed;
                          return {
                            ...d,
                            dailyReminderTimesManila: sanitizeSlots(next),
                          };
                        });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        busy || draft.dailyReminderTimesManila.length <= 1
                      }
                      className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove reminder ${idx + 1}`}
                      onClick={() =>
                        setDraft((d) => {
                          if (!d || d.dailyReminderTimesManila.length <= 1)
                            return d;
                          const next = d.dailyReminderTimesManila.filter(
                            (_, j) => j !== idx,
                          );
                          return {
                            ...d,
                            dailyReminderTimesManila: sanitizeSlots(next),
                          };
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                disabled={busy || draft.dailyReminderTimesManila.length >= 8}
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={() =>
                  setDraft((d) => {
                    if (!d || d.dailyReminderTimesManila.length >= 8) return d;
                    const sorted = [...d.dailyReminderTimesManila].sort(
                      slotSort,
                    );
                    const last = sorted[sorted.length - 1];
                    const nextSlot: ManilaReminderSlot = {
                      hour: Math.min(23, (last?.hour ?? 9) + 1),
                      minute: last?.minute ?? 0,
                    };
                    return {
                      ...d,
                      dailyReminderTimesManila: sanitizeSlots([
                        ...d.dailyReminderTimesManila,
                        nextSlot,
                      ]),
                    };
                  })
                }
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Add Time
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="urgency-days">Urgency Threshold (days)</Label>
                <Input
                  id="urgency-days"
                  type="number"
                  min={1}
                  max={30}
                  disabled={busy}
                  className="h-10"
                  value={draft.urgencyDaysThreshold}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            urgencyDaysThreshold: Number(e.target.value) || 1,
                          }
                        : d,
                    )
                  }
                />
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Also send the urgency template when the next free check-in is
                  within this many days.
                </p>
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="dates-limit">New Booking Date Limit</Label>
                <Input
                  id="dates-limit"
                  type="number"
                  min={1}
                  max={31}
                  disabled={busy}
                  className="h-10"
                  value={draft.newBookingDatesLimit}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            newBookingDatesLimit: Number(e.target.value) || 8,
                          }
                        : d,
                    )
                  }
                />
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Max upcoming dates listed in new booking messages.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="tg-templates" title="Message Templates">
            <div className="space-y-3 sm:space-y-4">
              <TemplateField
                id="tpl-daily-default"
                label="Daily Default"
                value={draft.dailyDefaultTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyDefaultTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftPreview(draft.dailyDefaultTemplate, 'Daily default')
                }
              />
              <TemplateField
                id="tpl-daily-urgency"
                label="Daily Urgency"
                value={draft.dailyUrgencyTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyUrgencyTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftPreview(draft.dailyUrgencyTemplate, 'Daily urgency')
                }
              />
              <TemplateField
                id="tpl-new"
                label="New Booking"
                value={draft.newBookingTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, newBookingTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftPreview(draft.newBookingTemplate, 'New booking')
                }
              />
              <TemplateField
                id="tpl-cancel"
                label="Cancellation"
                value={draft.cancellationTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, cancellationTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftPreview(draft.cancellationTemplate, 'Cancellation')
                }
              />
            </div>
          </CollapsibleSection>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !data}
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() => data && setDraft(data)}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="min-h-[44px] w-full gap-2 sm:w-auto"
            onClick={onSave}
          >
            <Send className="size-4 shrink-0" aria-hidden />
            Save settings
          </Button>
        </div>
      </div>
    </section>
  );
}
