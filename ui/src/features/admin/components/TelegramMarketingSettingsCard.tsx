import * as React from 'react';
import { Activity, ChevronDown, Send, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
          className="text-sm font-medium text-foreground cursor-pointer leading-snug"
        >
          {label}
        </label>
        <p className="text-xs text-muted-foreground leading-snug">
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
      className="group rounded-lg border border-border bg-muted/15"
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
        onClick={() => onSendDraft()}
      >
        Send preview
      </Button>
    </div>
  );
}

type DailyTestResult = { sent?: boolean; mode?: string; detail?: string };
type NotifyTestResult = {
  sent?: boolean;
  skip?: string;
  telegramError?: string;
};

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
        dailyDefaultTemplate: draft.dailyDefaultTemplate,
        dailyUrgencyTemplate: draft.dailyUrgencyTemplate,
        newBookingTemplate: draft.newBookingTemplate,
        cancellationTemplate: draft.cancellationTemplate,
      },
      {
        onSuccess: () => toast.success('Telegram marketing settings saved'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const runDraftSample = (text: string, label: string) => {
    testSend.mutate(
      { action: 'send_draft_with_sample_placeholders', text },
      {
        onSuccess: (j) => {
          toast.success(
            `${label}: sent (${j.messageCharCount ?? '?'} characters)`,
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
        className="w-full rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 sm:py-3.5 animate-pulse"
        aria-labelledby="telegram-marketing-heading"
      >
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-3 h-24 rounded bg-muted" />
      </section>
    );
  }

  return (
    <section
      className={cn(
        'w-full rounded-xl border border-sidebar-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4',
      )}
      aria-labelledby="telegram-marketing-heading"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2
            id="telegram-marketing-heading"
            className="text-base font-bold text-foreground sm:text-[14px]"
          >
            Telegram Notifications
          </h2>
        </div>

        <div className="space-y-3">
          <CollapsibleSection
            id="tg-tests"
            title="Test actions"
            defaultOpen
            triggerTitle="Uses saved templates from Postgres. Ignores Enable / notify toggles."
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
                          parts.push(
                            `chat_id=${v.credentials.normalizedChatId ?? 'n/a'} (raw chars: ${v.credentials.chatIdRawLength})`,
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
                          toast.success(
                            `Daily reminder sent (${r.mode ?? '?'})`,
                          );
                        } else {
                          toast.message(
                            `Daily reminder not sent (${r?.mode ?? 'unknown'})`,
                            {
                              description:
                                r?.detail ??
                                'Check Edge logs and TELEGRAM_* secrets.',
                            },
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
                    { action: 'send_test_new_booking' },
                    {
                      onSuccess: (j) => {
                        const r = j.result as NotifyTestResult | undefined;
                        if (r?.sent) toast.success('New booking sample sent');
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
                  Cancellation sample
                </p>
              </div>
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
                title="Manila calendar. Defaults: today / tomorrow. Clear both dates for the server’s 3-night demo window."
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    {
                      action: 'send_test_cancellation',
                      checkInYmd: testCancelCheckIn || undefined,
                      checkOutYmd: testCancelCheckOut || undefined,
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
                  )
                }
              >
                Send cancellation
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="tg-placeholders" title="Placeholder tokens">
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 sm:text-[13px]">
              {draft.placeholdersReference.map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection id="tg-auto" title="When to notify" defaultOpen>
            <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 space-y-1">
              <CheckboxRow
                id="tg-enabled"
                label="Enable Telegram sends"
                description="Off: cron and booking events skip Telegram."
                checked={draft.enabled}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, enabled: v } : d))
                }
              />
              <CheckboxRow
                id="tg-new"
                label="New booking request"
                description="First save of a new guest row only."
                checked={draft.notifyOnNewBooking}
                disabled={busy || !draft.enabled}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, notifyOnNewBooking: v } : d))
                }
              />
              <CheckboxRow
                id="tg-cancel"
                label="Cancellation"
                description="When an admin cancels from the workflow."
                checked={draft.notifyOnCancellation}
                disabled={busy || !draft.enabled}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, notifyOnCancellation: v } : d))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="urgency-days">Urgency threshold (days)</Label>
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
                  If the next free check-in (Manila) is sooner than this, the
                  urgency template is used.
                </p>
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="dates-limit">New-booking date cap</Label>
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
                  Max upcoming check-in dates listed for the current month.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="tg-templates"
            title="Message templates"
            defaultOpen
          >
            <div className="space-y-3 sm:space-y-4">
              <TemplateField
                id="tpl-daily-default"
                label="Daily default"
                value={draft.dailyDefaultTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyDefaultTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftSample(draft.dailyDefaultTemplate, 'Daily default')
                }
              />
              <TemplateField
                id="tpl-daily-urgency"
                label="Daily urgency"
                value={draft.dailyUrgencyTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyUrgencyTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftSample(draft.dailyUrgencyTemplate, 'Daily urgency')
                }
              />
              <TemplateField
                id="tpl-new"
                label="New booking"
                value={draft.newBookingTemplate}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, newBookingTemplate: v } : d))
                }
                onSendDraft={() =>
                  runDraftSample(draft.newBookingTemplate, 'New booking')
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
                  runDraftSample(draft.cancellationTemplate, 'Cancellation')
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
