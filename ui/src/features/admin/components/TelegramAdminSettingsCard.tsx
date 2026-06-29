import * as React from "react";
import {
  Activity,
  Bell,
  Braces,
  ChevronDown,
  Clock,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AdminSection,
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from "@/features/admin/components/AdminSectionNavLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { TelegramPlaceholdersReference } from "@/features/admin/components/TelegramPlaceholdersReference";
import { TelegramOperationsSettingsSkeleton } from "@/components/skeletons/AdminSkeletons";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TelegramTemplateEditor } from "@/features/admin/components/TelegramTemplateEditor";
import { buildValidPlaceholderKeySet } from "@/features/admin/lib/telegramPlaceholderGroups";
import {
  friendlyToastError,
  showTelegramVerifyToast,
  telegramScheduleSyncError,
} from "@/lib/toastMessages";
import {
  useTelegramAdminSettings,
  useTelegramAdminTestSend,
  useUpdateTelegramAdminSettings,
  type AdminDraftScenario,
  type AdminScenarioMeta,
  type TelegramAdminSettingsDto,
} from "@/features/admin/hooks/useTelegramAdminSettings";
import type { TelegramEnvVerifyDto } from "@/features/admin/lib/telegramEnvVerify";

const OPERATIONS_SECTIONS: AdminSectionNavItem[] = [
  { id: "schedule", label: "Schedule & Alerts", icon: Clock },
  { id: "templates", label: "Message Templates", icon: MessageSquare },
  { id: "placeholders", label: "Placeholders", icon: Braces },
];

type ScenarioKey =
  | "newBooking"
  | "pendingDocs"
  | "balanceReceipt"
  | "balanceReceiptUploaded"
  | "sdFormSubmitted"
  | "sdRefundPending";

const SCENARIO_CONFIG: Record<
  ScenarioKey,
  {
    scenarioId: AdminDraftScenario;
    toggleKey: keyof TelegramAdminSettingsDto;
    templateKey: keyof TelegramAdminSettingsDto;
    patchToggleKey:
      | "notifyOnNewBooking"
      | "notifyOnSdFormSubmitted"
      | "notifyOnBalanceReceiptUploaded"
      | "notifyPendingDocsHourly"
      | "notifyBalanceReceiptHourly"
      | "notifySdRefundPendingHourly";
    patchTemplateKey:
      | "newBookingTemplate"
      | "pendingDocsTemplate"
      | "balanceReceiptTemplate"
      | "balanceReceiptUploadedTemplate"
      | "sdFormSubmittedTemplate"
      | "sdRefundPendingTemplate";
  }
> = {
  newBooking: {
    scenarioId: "new_booking",
    toggleKey: "notifyOnNewBooking",
    templateKey: "newBookingTemplate",
    patchToggleKey: "notifyOnNewBooking",
    patchTemplateKey: "newBookingTemplate",
  },
  pendingDocs: {
    scenarioId: "pending_docs",
    toggleKey: "notifyPendingDocsHourly",
    templateKey: "pendingDocsTemplate",
    patchToggleKey: "notifyPendingDocsHourly",
    patchTemplateKey: "pendingDocsTemplate",
  },
  balanceReceipt: {
    scenarioId: "balance_receipt",
    toggleKey: "notifyBalanceReceiptHourly",
    templateKey: "balanceReceiptTemplate",
    patchToggleKey: "notifyBalanceReceiptHourly",
    patchTemplateKey: "balanceReceiptTemplate",
  },
  balanceReceiptUploaded: {
    scenarioId: "balance_receipt_uploaded",
    toggleKey: "notifyOnBalanceReceiptUploaded",
    templateKey: "balanceReceiptUploadedTemplate",
    patchToggleKey: "notifyOnBalanceReceiptUploaded",
    patchTemplateKey: "balanceReceiptUploadedTemplate",
  },
  sdFormSubmitted: {
    scenarioId: "sd_form_submitted",
    toggleKey: "notifyOnSdFormSubmitted",
    templateKey: "sdFormSubmittedTemplate",
    patchToggleKey: "notifyOnSdFormSubmitted",
    patchTemplateKey: "sdFormSubmittedTemplate",
  },
  sdRefundPending: {
    scenarioId: "sd_refund_pending",
    toggleKey: "notifySdRefundPendingHourly",
    templateKey: "sdRefundPendingTemplate",
    patchToggleKey: "notifySdRefundPendingHourly",
    patchTemplateKey: "sdRefundPendingTemplate",
  },
};

const SCENARIO_ORDER: ScenarioKey[] = [
  "newBooking",
  "pendingDocs",
  "balanceReceipt",
  "balanceReceiptUploaded",
  "sdFormSubmitted",
  "sdRefundPending",
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

function ScenarioCollapsible({
  id,
  title,
  badge,
  triggerTitle,
  children,
}: {
  id: string;
  title: string;
  badge?: React.ReactNode;
  triggerTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen
      className="group rounded-lg border border-border/50 bg-background/80"
    >
      <CollapsibleTrigger
        type="button"
        title={triggerTitle}
        className={cn(
          "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
          "text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:py-2",
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
          className="space-y-3 border-t border-separator px-3 pb-3 pt-3 sm:space-y-4"
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ScenarioBadge({ type }: { type: AdminScenarioMeta["type"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        type === "event"
          ? "bg-primary/10 text-primary"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
      )}
    >
      {type === "event" ? "Instant" : "Hourly"}
    </span>
  );
}

export function TelegramAdminSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramAdminSettings();
  const update = useUpdateTelegramAdminSettings();
  const testSend = useTelegramAdminTestSend();
  const [draft, setDraft] = React.useState<TelegramAdminSettingsDto | null>(
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
        notifyOnBalanceReceiptUploaded: draft.notifyOnBalanceReceiptUploaded,
        notifyPendingDocsHourly: draft.notifyPendingDocsHourly,
        notifyBalanceReceiptHourly: draft.notifyBalanceReceiptHourly,
        notifySdRefundPendingHourly: draft.notifySdRefundPendingHourly,
        newBookingTemplate: draft.newBookingTemplate,
        pendingDocsTemplate: draft.pendingDocsTemplate,
        balanceReceiptTemplate: draft.balanceReceiptTemplate,
        balanceReceiptUploadedTemplate: draft.balanceReceiptUploadedTemplate,
        sdFormSubmittedTemplate: draft.sdFormSubmittedTemplate,
        sdRefundPendingTemplate: draft.sdRefundPendingTemplate,
        resyncHourlyCron: true,
      },
      {
        onSuccess: ({ cronSync }) => {
          toast.success("Operations settings saved");
          if (cronSync && cronSync.ok !== true) {
            toast.error(
              telegramScheduleSyncError(
                "Hourly reminders could not be updated. Your other changes were saved.",
              ),
            );
          }
        },
        onError: (e) =>
          toast.error(friendlyToastError(e, "Could not save settings")),
      },
    );
  };

  const onSendDraftPreview = (scenario: AdminDraftScenario, text: string) => {
    if (!text.trim()) {
      toast.error("Template is empty");
      return;
    }
    testSend.mutate(
      { action: "send_draft_preview", text, scenario },
      {
        onSuccess: (j) => {
          if (j.sent) {
            toast.success("Preview sent");
          } else {
            toast.error(friendlyToastError(j.error, "Could not send preview"));
          }
        },
        onError: (e) =>
          toast.error(friendlyToastError(e, "Could not send preview")),
      },
    );
  };

  if (isError) {
    return (
      <section className="w-full rounded-xl border border-destructive/40 bg-card px-3 py-3 sm:px-4 sm:py-3.5">
        <p className="text-sm text-destructive">
          {(error as Error).message ?? "Failed to load operations settings"}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return <TelegramOperationsSettingsSkeleton />;
  }

  return (
    <div aria-labelledby="admin-operations-heading">
      <AdminSectionNavLayout
        sections={OPERATIONS_SECTIONS}
        header={
          <AdminPageHeader
            id="admin-operations-heading"
            variant="compact"
            title="Operations"
            subtitle="Workflow Telegram alerts for the admin team."
            icon={Bell}
          />
        }
        footer={
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
        }
      >
        <AdminSection id="schedule" title="Schedule & Alerts" icon={Clock}>
          <div className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:p-4">
            <CheckboxRow
              id="admin-enabled"
              label="Enable operations alerts"
              description="Off skips all instant and hourly alerts."
              checked={draft.enabled}
              disabled={busy}
              onChange={(v) => setDraft((d) => (d ? { ...d, enabled: v } : d))}
            />

            <div className="flex gap-2.5 border-t border-border/60 pt-3">
              <Clock
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Hourly cron schedule
                </p>
                <p>
                  Hourly when toggles are on. New bookings also ping once on
                  submit.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-[44px] w-full gap-2 sm:w-auto"
            onClick={() =>
              testSend.mutate(
                { action: "verify_admin_telegram_env" },
                {
                  onSuccess: (j) => {
                    showTelegramVerifyToast(
                      j.verify as TelegramEnvVerifyDto | undefined,
                      "Operations group",
                    );
                  },
                  onError: (e) =>
                    toast.error(
                      friendlyToastError(e, "Could not verify the connection"),
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
          description="Per-workflow toggles and templates."
        >
          <div className="space-y-2.5">
            {SCENARIO_ORDER.map((key) => {
              const cfg = SCENARIO_CONFIG[key];
              const meta = scenarioMetaById.get(cfg.scenarioId);
              const toggleChecked = Boolean(draft[cfg.toggleKey]);
              const templateValue = String(draft[cfg.templateKey] ?? "");
              const sectionId = `admin-scenario-${cfg.scenarioId}`;

              return (
                <ScenarioCollapsible
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
                    label={
                      meta?.type === "event"
                        ? "Send on event"
                        : "Send hourly while active"
                    }
                    description={
                      meta?.type === "event"
                        ? "Once when the event happens."
                        : "Every hour until cleared (once per hour max)."
                    }
                    checked={toggleChecked}
                    disabled={busy}
                    onChange={(v) =>
                      setDraft((d) => (d ? { ...d, [cfg.toggleKey]: v } : d))
                    }
                  />
                  <TelegramTemplateEditor
                    id={`${sectionId}-template`}
                    label="Message template"
                    value={templateValue}
                    disabled={busy}
                    rows={8}
                    minHeightClassName="min-h-[96px]"
                    previewSampleSet="admin"
                    validPlaceholderKeys={validPlaceholderKeys}
                    previewContext={{ bot: "admin", scenario: cfg.scenarioId }}
                    onChange={(v) =>
                      setDraft((d) => (d ? { ...d, [cfg.templateKey]: v } : d))
                    }
                    onSendDraft={() =>
                      onSendDraftPreview(cfg.scenarioId, templateValue)
                    }
                  />
                </ScenarioCollapsible>
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
