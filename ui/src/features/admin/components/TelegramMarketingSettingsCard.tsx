import * as React from 'react';
import {
  Activity,
  Braces,
  Clock,
  Megaphone,
  MessageSquare,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminSection,
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from '@/features/admin/components/AdminSectionNavLayout';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ManilaReminderTimesEditor, sanitizeReminderSlots } from '@/features/admin/components/ManilaReminderTimesEditor';
import { TelegramPlaceholdersReference } from '@/features/admin/components/TelegramPlaceholdersReference';
import { TelegramMarketingSettingsSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TelegramTemplateEditor } from '@/features/admin/components/TelegramTemplateEditor';
import type { TelegramPreviewContext } from '@/features/admin/lib/telegramDraftPreviewApi';
import { buildValidPlaceholderKeySet } from '@/features/admin/lib/telegramPlaceholderGroups';
import {
  useTelegramMarketingSettings,
  useTelegramMarketingTestSend,
  useUpdateTelegramMarketingSettings,
  type TelegramEnvVerifyDto,
  type TelegramMarketingSettingsDto,
} from '@/features/admin/hooks/useTelegramMarketingSettings';
import { getManilaYmdToday, getManilaYmdTomorrow } from '@/utils/dates';
import {
  friendlyToastError,
  showTelegramVerifyToast,
  telegramScheduleSyncError,
} from '@/lib/toastMessages';

function marketingPreviewContext(template: string): TelegramPreviewContext {
  const needsCancelDates = /\{\{cancellation_dates\}\}/.test(template);
  return {
    bot: 'marketing',
    ...(needsCancelDates
      ? {
          checkInYmd: getManilaYmdToday(),
          checkOutYmd: getManilaYmdTomorrow(),
        }
      : {}),
  };
}

const MARKETING_SECTIONS: AdminSectionNavItem[] = [
  { id: 'schedule', label: 'Schedule & Alerts', icon: Clock },
  { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  { id: 'placeholders', label: 'Placeholders', icon: Braces },
];

/** Dense settings forms — matches time-slot row labels, not default Label scale. */
const SETTINGS_FIELD_LABEL =
  'text-xs font-medium leading-snug text-muted-foreground';

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

export function TelegramMarketingSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramMarketingSettings();
  const update = useUpdateTelegramMarketingSettings();
  const testSend = useTelegramMarketingTestSend();

  const [draft, setDraft] = React.useState<TelegramMarketingSettingsDto | null>(
    null,
  );

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const busy = isLoading || update.isPending || testSend.isPending;

  const validPlaceholderKeys = React.useMemo(
    () =>
      draft
        ? buildValidPlaceholderKeySet(draft.placeholdersReference)
        : undefined,
    [draft?.placeholdersReference],
  );

  const onSave = () => {
    if (!draft) return;
    update.mutate(
      {
        enabled: draft.enabled,
        notifyOnNewBooking: draft.notifyOnNewBooking,
        notifyOnCancellation: draft.notifyOnCancellation,
        urgencyDaysThreshold: draft.urgencyDaysThreshold,
        newBookingDatesLimit: draft.newBookingDatesLimit,
        dailyReminderTimesManila: sanitizeReminderSlots(draft.dailyReminderTimesManila),
        dailyDefaultTemplate: draft.dailyDefaultTemplate,
        dailyUrgencyTemplate: draft.dailyUrgencyTemplate,
        newBookingTemplate: draft.newBookingTemplate,
        cancellationTemplate: draft.cancellationTemplate,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success('Marketing settings saved');
          if (cronSync && cronSync.ok !== true) {
            toast.error(telegramScheduleSyncError());
          }
        },
        onError: (e) => toast.error(friendlyToastError(e, 'Could not save settings')),
      },
    );
  };

  const runDraftPreview = (text: string, _label: string) => {
    const needsCancelDates = /\{\{cancellation_dates\}\}/.test(text);
    testSend.mutate(
      {
        action: 'send_draft_preview',
        text,
        ...(needsCancelDates
          ? {
              checkInYmd: getManilaYmdToday(),
              checkOutYmd: getManilaYmdTomorrow(),
            }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success('Preview sent');
        },
        onError: (e) => toast.error(friendlyToastError(e, 'Could not send preview')),
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
    return <TelegramMarketingSettingsSkeleton />;
  }

  return (
    <div aria-labelledby="telegram-marketing-heading">
      <AdminSectionNavLayout
        sections={MARKETING_SECTIONS}
        header={
          <AdminPageHeader
            id="telegram-marketing-heading"
            variant="compact"
            title="Marketing"
            subtitle="Telegram reminders for the marketing group."
            icon={Megaphone}
          />
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        }
      >
          <AdminSection
            id="schedule"
            title="Schedule & Alerts"
            icon={Clock}
          >
            <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 space-y-1">
              <CheckboxRow
                id="tg-enabled"
                label="Enable Telegram sends"
                description="Skips scheduled posts and booking alerts when off."
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
                    Manila times for daily posts. Urgent stays also get the
                    urgency template.
                  </p>
                </div>
              </div>

              <ManilaReminderTimesEditor
                slots={draft.dailyReminderTimesManila}
                disabled={busy}
                onChange={(dailyReminderTimesManila) =>
                  setDraft((d) =>
                    d ? { ...d, dailyReminderTimesManila } : d,
                  )
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="urgency-days" className={SETTINGS_FIELD_LABEL}>
                  Urgency Threshold (days)
                </Label>
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
                  Send urgency template when next free check-in is this close.
                </p>
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="dates-limit" className={SETTINGS_FIELD_LABEL}>
                  New Booking Date Limit
                </Label>
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
                  Max upcoming dates in new booking messages.
                </p>
              </div>
            </div>

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
                      showTelegramVerifyToast(
                        j.verify as TelegramEnvVerifyDto | undefined,
                        'Marketing group',
                      );
                    },
                    onError: (e) =>
                      toast.error(
                        friendlyToastError(e, 'Could not verify the connection'),
                      ),
                  },
                )
              }
            >
              <Activity className="size-4 shrink-0" aria-hidden />
              Verify bot
            </Button>
          </AdminSection>

          <AdminSection
            id="templates"
            title="Message Templates"
            icon={MessageSquare}
          >
            <div className="space-y-3 sm:space-y-4">
              <TelegramTemplateEditor
                id="tpl-daily-default"
                label="Daily Default"
                rows={3}
                value={draft.dailyDefaultTemplate}
                disabled={busy}
                previewSampleSet="marketing"
                validPlaceholderKeys={validPlaceholderKeys}
                previewContext={marketingPreviewContext(draft.dailyDefaultTemplate)}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyDefaultTemplate: v } : d))
                }
                sendPreviewTitle="Send test with live calendar data."
                onSendDraft={() =>
                  runDraftPreview(draft.dailyDefaultTemplate, 'Daily default')
                }
              />
              <TelegramTemplateEditor
                id="tpl-daily-urgency"
                label="Daily Urgency"
                rows={3}
                value={draft.dailyUrgencyTemplate}
                disabled={busy}
                previewSampleSet="marketing"
                validPlaceholderKeys={validPlaceholderKeys}
                previewContext={marketingPreviewContext(draft.dailyUrgencyTemplate)}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, dailyUrgencyTemplate: v } : d))
                }
                sendPreviewTitle="Send test with live calendar data."
                onSendDraft={() =>
                  runDraftPreview(draft.dailyUrgencyTemplate, 'Daily urgency')
                }
              />
              <TelegramTemplateEditor
                id="tpl-new"
                label="New Booking"
                rows={3}
                value={draft.newBookingTemplate}
                disabled={busy}
                previewSampleSet="marketing"
                validPlaceholderKeys={validPlaceholderKeys}
                previewContext={marketingPreviewContext(draft.newBookingTemplate)}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, newBookingTemplate: v } : d))
                }
                sendPreviewTitle="Send test with live calendar data."
                onSendDraft={() =>
                  runDraftPreview(draft.newBookingTemplate, 'New booking')
                }
              />
              <TelegramTemplateEditor
                id="tpl-cancel"
                label="Cancellation"
                rows={3}
                value={draft.cancellationTemplate}
                disabled={busy}
                previewSampleSet="marketing"
                validPlaceholderKeys={validPlaceholderKeys}
                previewContext={marketingPreviewContext(draft.cancellationTemplate)}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, cancellationTemplate: v } : d))
                }
                sendPreviewTitle="Send test with live calendar data."
                onSendDraft={() =>
                  runDraftPreview(draft.cancellationTemplate, 'Cancellation')
                }
              />
            </div>
          </AdminSection>

          <AdminSection
            id="placeholders"
            title={`Placeholders (${draft.placeholdersReference.length})`}
            icon={Braces}
          >
            <TelegramPlaceholdersReference lines={draft.placeholdersReference} />
          </AdminSection>
      </AdminSectionNavLayout>
    </div>
  );
}
