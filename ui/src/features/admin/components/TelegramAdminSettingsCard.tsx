import * as React from 'react';
import {
  Activity,
  Bell,
  ChevronDown,
  Clock,
  Send,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTelegramAdminSettings,
  useTelegramAdminTestSend,
  useUpdateTelegramAdminSettings,
  type AdminDraftScenario,
  type AdminEnvVerifyDto,
  type AdminScenarioMeta,
  type TelegramAdminSettingsDto,
} from '@/features/admin/hooks/useTelegramAdminSettings';

type ScenarioKey =
  | 'newBooking'
  | 'pendingDocs'
  | 'balanceReceipt'
  | 'sdFormSubmitted'
  | 'sdRefundPending';

const SCENARIO_CONFIG: Record<
  ScenarioKey,
  {
    scenarioId: AdminDraftScenario;
    toggleKey: keyof TelegramAdminSettingsDto;
    templateKey: keyof TelegramAdminSettingsDto;
    patchToggleKey:
      | 'notifyOnNewBooking'
      | 'notifyOnSdFormSubmitted'
      | 'notifyPendingDocsHourly'
      | 'notifyBalanceReceiptHourly'
      | 'notifySdRefundPendingHourly';
    patchTemplateKey:
      | 'newBookingTemplate'
      | 'pendingDocsTemplate'
      | 'balanceReceiptTemplate'
      | 'sdFormSubmittedTemplate'
      | 'sdRefundPendingTemplate';
  }
> = {
  newBooking: {
    scenarioId: 'new_booking',
    toggleKey: 'notifyOnNewBooking',
    templateKey: 'newBookingTemplate',
    patchToggleKey: 'notifyOnNewBooking',
    patchTemplateKey: 'newBookingTemplate',
  },
  pendingDocs: {
    scenarioId: 'pending_docs',
    toggleKey: 'notifyPendingDocsHourly',
    templateKey: 'pendingDocsTemplate',
    patchToggleKey: 'notifyPendingDocsHourly',
    patchTemplateKey: 'pendingDocsTemplate',
  },
  balanceReceipt: {
    scenarioId: 'balance_receipt',
    toggleKey: 'notifyBalanceReceiptHourly',
    templateKey: 'balanceReceiptTemplate',
    patchToggleKey: 'notifyBalanceReceiptHourly',
    patchTemplateKey: 'balanceReceiptTemplate',
  },
  sdFormSubmitted: {
    scenarioId: 'sd_form_submitted',
    toggleKey: 'notifyOnSdFormSubmitted',
    templateKey: 'sdFormSubmittedTemplate',
    patchToggleKey: 'notifyOnSdFormSubmitted',
    patchTemplateKey: 'sdFormSubmittedTemplate',
  },
  sdRefundPending: {
    scenarioId: 'sd_refund_pending',
    toggleKey: 'notifySdRefundPendingHourly',
    templateKey: 'sdRefundPendingTemplate',
    patchToggleKey: 'notifySdRefundPendingHourly',
    patchTemplateKey: 'sdRefundPendingTemplate',
  },
};

const SCENARIO_ORDER: ScenarioKey[] = [
  'newBooking',
  'pendingDocs',
  'balanceReceipt',
  'sdFormSubmitted',
  'sdRefundPending',
];

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
        <p className="text-caption leading-snug">{description}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  badge,
  defaultOpen,
  triggerTitle,
  children,
}: {
  id: string;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
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
        {badge}
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

function ScenarioBadge({ type }: { type: AdminScenarioMeta['type'] }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        type === 'event'
          ? 'bg-primary/10 text-primary'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
      )}
    >
      {type === 'event' ? 'Instant' : 'Hourly'}
    </span>
  );
}

type HourlyCronResult = {
  sent?: boolean;
  mode?: string;
  pendingDocsSent?: number;
  balanceReceiptSent?: number;
  sdRefundPendingSent?: number;
  detail?: string;
};

export function TelegramAdminSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramAdminSettings();
  const update = useUpdateTelegramAdminSettings();
  const testSend = useTelegramAdminTestSend();
  const [draft, setDraft] = React.useState<TelegramAdminSettingsDto | null>(null);

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const busy = isLoading || update.isPending || testSend.isPending;

  const scenarioMetaById = React.useMemo(() => {
    const map = new Map<string, AdminScenarioMeta>();
    for (const s of draft?.scenarios ?? []) map.set(s.id, s);
    return map;
  }, [draft?.scenarios]);

  const onSave = () => {
    if (!draft) return;
    update.mutate(
      {
        enabled: draft.enabled,
        notifyOnNewBooking: draft.notifyOnNewBooking,
        notifyOnSdFormSubmitted: draft.notifyOnSdFormSubmitted,
        notifyPendingDocsHourly: draft.notifyPendingDocsHourly,
        notifyBalanceReceiptHourly: draft.notifyBalanceReceiptHourly,
        notifySdRefundPendingHourly: draft.notifySdRefundPendingHourly,
        newBookingTemplate: draft.newBookingTemplate,
        pendingDocsTemplate: draft.pendingDocsTemplate,
        balanceReceiptTemplate: draft.balanceReceiptTemplate,
        sdFormSubmittedTemplate: draft.sdFormSubmittedTemplate,
        sdRefundPendingTemplate: draft.sdRefundPendingTemplate,
        resyncHourlyCron: true,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success('Operations settings saved');
          if (cronSync && cronSync.ok !== true) {
            toast.error(
              cronSync.error ??
                'Hourly cron could not be updated. Settings were still saved.',
            );
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onSendDraftPreview = (scenario: AdminDraftScenario, text: string) => {
    if (!text.trim()) {
      toast.error('Template is empty');
      return;
    }
    testSend.mutate(
      { action: 'send_draft_preview', text, scenario },
      {
        onSuccess: (j) => {
          if (j.sent) {
            const guest = j.previewGuestName as string | undefined;
            toast.success(
              `Preview sent${guest ? ` for ${guest}` : ''} (${j.messageCharCount ?? '?'} characters)`,
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
      <section className="w-full rounded-xl border border-destructive/40 bg-card px-3 py-3 sm:px-4 sm:py-3.5">
        <p className="text-sm text-destructive">
          {(error as Error).message ?? 'Failed to load operations settings'}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return (
      <section
        className="surface-card w-full px-3 py-3 animate-pulse sm:px-4 sm:py-3.5"
        aria-labelledby="admin-operations-heading"
      >
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-3 h-32 rounded bg-muted" />
      </section>
    );
  }

  return (
    <section
      className={cn('surface-card w-full px-3 py-3 sm:px-4 sm:py-4')}
      aria-labelledby="admin-operations-heading"
    >
      <div className="space-y-4">
        <AdminPageHeader
          id="admin-operations-heading"
          title="Operations"
          subtitle="Workflow Telegram reminders for your admin team."
          icon={Bell}
        />

        <CollapsibleSection id="admin-tests" title="Test & diagnostics" defaultOpen>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-[44px] w-full gap-2 sm:w-auto"
              onClick={() =>
                testSend.mutate(
                  { action: 'verify_admin_telegram_env' },
                  {
                    onSuccess: (j) => {
                      const v = j.verify as AdminEnvVerifyDto | undefined;
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
                      toast.message('Admin Telegram diagnostics', {
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
              className="min-h-[44px] w-full gap-2 sm:w-auto"
              onClick={() =>
                testSend.mutate(
                  { action: 'run_hourly_cron_now' },
                  {
                    onSuccess: (j) => {
                      const r = j.result as HourlyCronResult | undefined;
                      if (r?.sent) {
                        toast.success(
                          `Hourly run sent ${(r.pendingDocsSent ?? 0) + (r.balanceReceiptSent ?? 0) + (r.sdRefundPendingSent ?? 0)} message(s)`,
                        );
                      } else {
                        toast.message(`Hourly run: ${r?.mode ?? 'unknown'}`, {
                          description:
                            r?.detail ??
                            'No matching bookings or alerts disabled. Check toggles and live data.',
                        });
                      }
                    },
                    onError: (e) => toast.error((e as Error).message),
                  },
                )
              }
            >
              <Zap className="size-4 shrink-0" aria-hidden />
              Run hourly now
            </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection id="admin-placeholders" title="Placeholders">
          <p className="text-xs text-muted-foreground leading-snug">
            Use these tokens in any template. Unrecognized tokens stay literal in the
            message.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {draft.placeholdersReference.map((token) => (
              <code
                key={token}
                className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-foreground"
              >
                {token}
              </code>
            ))}
          </div>
        </CollapsibleSection>

        <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2">
          <CheckboxRow
            id="admin-enabled"
            label="Enable operations alerts"
            description="Master switch. Turning it off skips all event and hourly sends."
            checked={draft.enabled}
            disabled={busy}
            onChange={(v) => setDraft((d) => (d ? { ...d, enabled: v } : d))}
          />
        </div>

        <div className="flex gap-2.5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Hourly cron schedule</p>
            <p>
              Pending docs, balance receipt, and SD refund reminders run{' '}
              <span className="font-medium text-foreground">every hour</span> when their
              scenario toggle is on.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SCENARIO_ORDER.map((key) => {
            const cfg = SCENARIO_CONFIG[key];
            const meta = scenarioMetaById.get(cfg.scenarioId);
            const toggleChecked = Boolean(draft[cfg.toggleKey]);
            const templateValue = String(draft[cfg.templateKey] ?? '');
            const sectionId = `admin-scenario-${cfg.scenarioId}`;

            return (
              <CollapsibleSection
                key={key}
                id={sectionId}
                title={meta?.label ?? cfg.scenarioId}
                badge={meta ? <ScenarioBadge type={meta.type} /> : undefined}
                triggerTitle={meta?.trigger}
              >
                {meta && (
                  <p className="text-xs text-muted-foreground leading-snug rounded-md bg-muted/30 px-2.5 py-2">
                    {meta.trigger}
                  </p>
                )}
                <CheckboxRow
                  id={`${sectionId}-toggle`}
                  label={meta?.type === 'event' ? 'Send on event' : 'Send hourly while active'}
                  description={
                    meta?.type === 'event'
                      ? 'Fires once when the event happens.'
                      : 'Repeats each hour until the condition clears (deduped per hour).'
                  }
                  checked={toggleChecked}
                  disabled={busy}
                  onChange={(v) =>
                    setDraft((d) =>
                      d ? { ...d, [cfg.toggleKey]: v } : d,
                    )
                  }
                />
                <div className="space-y-2">
                  <Label
                    htmlFor={`${sectionId}-template`}
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Message template
                  </Label>
                  <Textarea
                    id={`${sectionId}-template`}
                    disabled={busy}
                    rows={4}
                    className="min-h-[96px] w-full resize-y text-sm sm:text-[13px]"
                    value={templateValue}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, [cfg.templateKey]: e.target.value } : d,
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    className="min-h-[44px] w-full gap-2 sm:w-auto"
                    onClick={() =>
                      onSendDraftPreview(cfg.scenarioId, templateValue)
                    }
                  >
                    <Send className="size-4 shrink-0" aria-hidden />
                    Send preview
                  </Button>
                </div>
              </CollapsibleSection>
            );
          })}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !data}
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() => data && setDraft(data)}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="min-h-[44px] w-full sm:w-auto"
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
