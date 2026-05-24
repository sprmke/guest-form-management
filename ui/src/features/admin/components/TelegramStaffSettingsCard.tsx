import * as React from 'react';
import {
  Activity,
  ChevronDown,
  Clock,
  Send,
} from 'lucide-react';
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
  useTelegramStaffSettings,
  useTelegramStaffTestSend,
  useUpdateTelegramStaffSettings,
  type StaffEnvVerifyDto,
  type TelegramStaffSettingsDto,
  type StaffTimeSlot,
} from '@/features/admin/hooks/useTelegramStaffSettings';

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

function slotToTimeInputValue(slot: StaffTimeSlot): string {
  return `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
}

function timeInputValueToSlot(value: string): StaffTimeSlot | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function formatManilaTimeLabel(slot: StaffTimeSlot): string {
  const d = new Date(2000, 0, 1, slot.hour, slot.minute);
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

type DailySummaryTestResult = {
  sent?: boolean;
  mode?: string;
  detail?: string;
  todayBookingCount?: number;
  nextDaysBookingCount?: number;
  messagesSent?: number;
};

export function TelegramStaffSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramStaffSettings();
  const update = useUpdateTelegramStaffSettings();
  const testSend = useTelegramStaffTestSend();

  const [draft, setDraft] = React.useState<TelegramStaffSettingsDto | null>(
    null,
  );

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const busy = isLoading || update.isPending || testSend.isPending;

  const onSave = () => {
    if (!draft) return;
    update.mutate(
      {
        enabled: draft.enabled,
        dailySummaryTemplate: draft.dailySummaryTemplate,
        dailySummaryTimeManila: draft.dailySummaryTimeManila,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success('Staff notification settings saved');
          if (cronSync && cronSync.ok !== true) {
            toast.error(
              cronSync.error ??
                'Could not reschedule pg_cron job. Check Integrations → Cron and Edge logs (settings still saved).',
            );
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onSendDraftPreview = () => {
    if (!draft?.dailySummaryTemplate.trim()) {
      toast.error('Template is empty');
      return;
    }
    testSend.mutate(
      { action: 'send_draft_preview', text: draft.dailySummaryTemplate },
      {
        onSuccess: (j) => {
          if (j.sent) {
            const guest = j.previewGuestName as string | undefined;
            const count = j.todayBookingCount as number | undefined;
            const suffix =
              guest && count && count > 1
                ? ` for ${guest} (first of ${count} today)`
                : guest
                  ? ` for ${guest}`
                  : '';
            toast.success(
              `Preview sent with live booking data${suffix} (${j.messageCharCount ?? '?'} characters)`,
            );
          } else {
            toast.error(j.error ?? 'Failed to send preview');
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  if (isError) {
    return (
      <section
        className="w-full rounded-xl border border-destructive/40 bg-card px-3 py-3 sm:px-4 sm:py-3.5"
        aria-labelledby="staff-heading"
      >
        <p className="text-sm text-destructive">
          {(error as Error).message ?? 'Failed to load staff settings'}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return (
      <section
        className="w-full rounded-xl border border-sidebar-border bg-card px-3 py-3 sm:px-4 sm:py-3.5 animate-pulse"
        aria-labelledby="staff-heading"
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
      aria-labelledby="staff-heading"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2
            id="staff-heading"
            className="text-base font-bold text-foreground sm:text-[14px]"
          >
            Staff / Cleaner Notifications
          </h2>
          <p className="text-xs text-muted-foreground leading-snug">
            Daily booking summary sent to your staff/cleaner Telegram group.
          </p>
        </div>

        <div className="space-y-3">
          {/* Test actions */}
          <CollapsibleSection
            id="staff-tests"
            title="Test actions"
            defaultOpen
            triggerTitle="Test the staff Telegram bot and send a test daily summary."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={() =>
                  testSend.mutate(
                    { action: 'verify_staff_telegram_env' },
                    {
                      onSuccess: (j) => {
                        const v = j.verify as StaffEnvVerifyDto | undefined;
                        if (!v) {
                          toast.error('No verify payload from server');
                          return;
                        }
                        const parts: string[] = [];
                        if (v.credentials.normalizeError) {
                          parts.push(v.credentials.normalizeError);
                        } else {
                          parts.push(
                            `chat_id=${v.credentials.normalizedChatId ?? 'n/a'}`,
                          );
                        }
                        parts.push(
                          v.getMe.ok
                            ? `getMe ok @${v.getMe.username ?? '?'}`
                            : `getMe: ${v.getMe.error ?? 'failed'}`,
                        );
                        parts.push(
                          v.getChat.ok
                            ? `getChat ok: ${v.getChat.type ?? '?'} "${v.getChat.title ?? 'private'}"`
                            : `getChat: ${v.getChat.error ?? 'failed'}`,
                        );
                        toast.message('Staff Telegram diagnostics', {
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
                    { action: 'send_test_daily_summary' },
                    {
                      onSuccess: (j) => {
                        const r = j.result as DailySummaryTestResult | undefined;
                        if (r?.sent) {
                          toast.success(
                            `Daily summary sent (${r.todayBookingCount ?? 0} today, ${r.nextDaysBookingCount ?? 0} upcoming, ${r.messagesSent ?? 0} message(s))`,
                          );
                        } else {
                          toast.error(
                            r?.detail ??
                              `Not sent (${r?.mode ?? 'unknown'}). Check Edge logs and TELEGRAM_STAFF_* secrets.`,
                          );
                        }
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                Daily summary
              </Button>
            </div>
          </CollapsibleSection>

          {/* Placeholder tokens */}
          <CollapsibleSection id="staff-placeholders" title="Placeholder tokens">
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 sm:text-[13px]">
              {draft.placeholdersReference.map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          {/* Settings */}
          <CollapsibleSection id="staff-config" title="When to notify">
            <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 space-y-1">
              <CheckboxRow
                id="staff-enabled"
                label="Enable daily staff summary"
                description="Off: daily cron skips the staff Telegram group."
                checked={draft.enabled}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, enabled: v } : d))
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
                    Daily summary time
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    When the cron job sends the booking summary. Time is{' '}
                    <span className="font-medium text-foreground/90">
                      Philippines (Manila)
                    </span>
                    . Saving updates the{' '}
                    <span className="font-medium text-foreground/90">
                      telegram-staff-daily
                    </span>{' '}
                    cron job.
                  </p>
                </div>
              </div>

              <p
                className="rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground"
                aria-live="polite"
              >
                <span className="font-medium text-foreground">
                  Schedule:{' '}
                </span>
                {formatManilaTimeLabel(draft.dailySummaryTimeManila)} daily
              </p>

              <div className="flex items-center gap-2 sm:gap-3">
                <Label
                  htmlFor="staff-slot-time"
                  className="w-16 shrink-0 text-xs text-muted-foreground sm:w-20 sm:text-sm"
                >
                  Time
                </Label>
                <Input
                  id="staff-slot-time"
                  type="time"
                  disabled={busy}
                  value={slotToTimeInputValue(draft.dailySummaryTimeManila)}
                  className="h-10 min-h-[44px] min-w-0 flex-1 max-w-[11rem] text-base sm:text-sm"
                  onChange={(e) => {
                    const parsed = timeInputValueToSlot(e.target.value);
                    if (!parsed) return;
                    setDraft((d) =>
                      d
                        ? { ...d, dailySummaryTimeManila: parsed }
                        : d,
                    );
                  }}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Message template */}
          <CollapsibleSection id="staff-template" title="Message template">
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-2 rounded-md border border-border/80 bg-background/80 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-2 sm:p-3 sm:items-start">
                <Label
                  htmlFor="staff-template-textarea"
                  className="min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-start-1 sm:row-start-1 sm:self-center sm:text-[11px]"
                >
                  Daily summary
                </Label>
                <Textarea
                  id="staff-template-textarea"
                  disabled={busy}
                  rows={14}
                  className="col-span-full min-h-[200px] min-w-0 w-full resize-y text-sm font-mono sm:col-span-2 sm:row-start-2 sm:text-[13px]"
                  value={draft.dailySummaryTemplate}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? { ...d, dailySummaryTemplate: e.target.value }
                        : d,
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="min-h-[44px] w-full min-w-0 sm:col-start-2 sm:row-start-1 sm:h-9 sm:w-auto sm:min-h-9 sm:shrink-0 sm:justify-self-end sm:self-center"
                  title="Sends to Telegram with live data from today's check-in(s) and next 3 days — same placeholders as the daily cron."
                  onClick={onSendDraftPreview}
                >
                  Send preview
                </Button>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Save / Reset */}
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
