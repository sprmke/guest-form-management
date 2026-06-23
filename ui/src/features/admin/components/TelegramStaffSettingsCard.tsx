import * as React from 'react';
import {
  Activity,
  Braces,
  ChevronDown,
  Clock,
  HardHat,
  MessageSquare,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AdminSection,
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from '@/features/admin/components/AdminSectionNavLayout';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ManilaTimeField, formatManilaTimeLabel } from '@/features/admin/components/ManilaReminderTimesEditor';
import { TelegramPlaceholdersReference } from '@/features/admin/components/TelegramPlaceholdersReference';
import { TelegramStaffSettingsSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TelegramTemplateEditor } from '@/features/admin/components/TelegramTemplateEditor';
import { buildValidPlaceholderKeySet } from '@/features/admin/lib/telegramPlaceholderGroups';
import {
  friendlyToastError,
  showTelegramVerifyToast,
  telegramScheduleSyncError,
} from '@/lib/toastMessages';
import {
  useTelegramStaffSettings,
  useTelegramStaffTestSend,
  useUpdateTelegramStaffSettings,
  type StaffEnvVerifyDto,
  type StaffScenarioMeta,
  type StaffDraftScenario,
  type TelegramStaffSettingsDto,
} from '@/features/admin/hooks/useTelegramStaffSettings';

const STAFF_SECTIONS: AdminSectionNavItem[] = [
  { id: 'schedule', label: 'Schedule & Alerts', icon: Clock },
  { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  { id: 'placeholders', label: 'Placeholders', icon: Braces },
];

function ScenarioBadge({ type }: { type: StaffScenarioMeta['type'] }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        type === 'event'
          ? 'bg-primary/10 text-primary'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
      )}
    >
      {type === 'event' ? 'Instant' : 'Daily'}
    </span>
  );
}

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
          className="text-ui cursor-pointer"
        >
          {label}
        </label>
        <p className="text-caption">
          {description}
        </p>
      </div>
    </div>
  );
}

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
        notifyOnSameDayCheckin: draft.notifyOnSameDayCheckin,
        dailySummaryTemplate: draft.dailySummaryTemplate,
        dailySummaryNoBookingsTemplate: draft.dailySummaryNoBookingsTemplate,
        sameDayCheckinTemplate: draft.sameDayCheckinTemplate,
        dailySummaryTimeManila: draft.dailySummaryTimeManila,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success('Staff settings saved');
          if (cronSync && cronSync.ok !== true) {
            toast.error(telegramScheduleSyncError());
          }
        },
        onError: (e) => toast.error(friendlyToastError(e, 'Could not save settings')),
      },
    );
  };

  const scenarioMetaById = React.useMemo(() => {
    const map = new Map<string, StaffScenarioMeta>();
    for (const s of draft?.scenarios ?? []) map.set(s.id, s);
    return map;
  }, [draft?.scenarios]);

  const onSendDraftPreview = (scenario: StaffDraftScenario, text: string) => {
    if (!text.trim()) {
      toast.error('Template is empty');
      return;
    }
    testSend.mutate(
      { action: 'send_draft_preview', text, scenario },
      {
        onSuccess: (j) => {
          if (j.sent) {
            toast.success('Preview sent');
          } else {
            toast.error(friendlyToastError(j.error, 'Could not send preview'));
          }
        },
        onError: (e) => toast.error(friendlyToastError(e, 'Could not send preview')),
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
    return <TelegramStaffSettingsSkeleton />;
  }

  return (
    <div aria-labelledby="staff-heading">
    <AdminSectionNavLayout
      sections={STAFF_SECTIONS}
      header={
        <AdminPageHeader
          id="staff-heading"
          variant="compact"
          title="Staff"
          subtitle="Daily summary and same-day check-in alerts."
          icon={HardHat}
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
            <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 space-y-3">
              <CheckboxRow
                id="staff-enabled"
                label="Enable Daily Summary"
                description="Skips the scheduled staff message when off."
                checked={draft.enabled}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, enabled: v } : d))
                }
              />
              <CheckboxRow
                id="staff-same-day"
                label="Same-day check-in alert"
                description={`One alert for today's check-ins from ${formatManilaTimeLabel(draft.dailySummaryTimeManila)} onward.`}
                checked={draft.notifyOnSameDayCheckin}
                disabled={busy}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, notifyOnSameDayCheckin: v } : d))
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
                    Manila send time. Same-day alerts start here too.
                  </p>
                </div>
              </div>

              <ManilaTimeField
                inputId="staff-slot-time"
                slot={draft.dailySummaryTimeManila}
                disabled={busy}
                onChange={(dailySummaryTimeManila) =>
                  setDraft((d) =>
                    d ? { ...d, dailySummaryTimeManila } : d,
                  )
                }
              />
            </div>

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
                      showTelegramVerifyToast(
                        j.verify as StaffEnvVerifyDto | undefined,
                        'Staff group',
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
            <div className="space-y-4">
              {(
                [
                  {
                    id: 'daily_summary',
                    label: 'Daily Summary',
                    templateKey: 'dailySummaryTemplate' as const,
                    scenario: 'daily_summary' as const,
                    rows: 14,
                  },
                  {
                    id: 'daily_summary_no_bookings',
                    label: 'No Bookings',
                    templateKey: 'dailySummaryNoBookingsTemplate' as const,
                    scenario: 'daily_summary_no_bookings' as const,
                    rows: 16,
                  },
                  {
                    id: 'same_day_checkin',
                    label: 'Same-Day Check-In Alert',
                    templateKey: 'sameDayCheckinTemplate' as const,
                    scenario: 'same_day_checkin' as const,
                    rows: 10,
                  },
                ] as const
              ).map(({ id, label, templateKey, scenario, rows }) => {
                const meta = scenarioMetaById.get(id);
                const templateValue = String(draft[templateKey] ?? '');

                return (
                  <Collapsible
                    key={id}
                    defaultOpen
                    className="group rounded-lg border border-border/50 bg-background/80"
                  >
                    <CollapsibleTrigger
                      type="button"
                      className={cn(
                        'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
                        'text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:py-2',
                      )}
                      aria-controls={`staff-${id}-panel`}
                    >
                      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
                      {meta ? <ScenarioBadge type={meta.type} /> : null}
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-data-[state=open]:rotate-180"
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div
                        id={`staff-${id}-panel`}
                        className="space-y-3 border-t border-separator px-3 pb-3 pt-3 sm:space-y-4"
                      >
                        {meta && (
                          <p className="text-xs text-muted-foreground leading-snug rounded-md bg-muted/30 px-2.5 py-2">
                            {meta.trigger}
                          </p>
                        )}
                        <TelegramTemplateEditor
                          id={`staff-template-${id}`}
                          label={label}
                          labelClassName="sr-only"
                          value={templateValue}
                          disabled={busy}
                          rows={rows}
                          minHeightClassName="min-h-[160px]"
                          mono
                          previewSampleSet="staff"
                          validPlaceholderKeys={validPlaceholderKeys}
                          previewContext={{ bot: 'staff', scenario }}
                          sendPreviewTitle="Send test with live booking data."
                          onChange={(v) =>
                            setDraft((d) => (d ? { ...d, [templateKey]: v } : d))
                          }
                          onSendDraft={() =>
                            onSendDraftPreview(scenario, templateValue)
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
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
