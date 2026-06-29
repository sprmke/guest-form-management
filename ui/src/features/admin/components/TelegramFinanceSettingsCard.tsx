import * as React from "react";
import { Wifi } from "lucide-react";
import { toast } from "sonner";
import { TelegramTemplateEditor } from "@/features/admin/components/TelegramTemplateEditor";
import { buildValidPlaceholderKeySet } from "@/features/admin/lib/telegramPlaceholderGroups";
import { Button } from "@/components/ui/button";
import {
  friendlyToastError,
  showTelegramVerifyToast,
  telegramScheduleSyncError,
} from "@/lib/toastMessages";
import {
  useTelegramFinanceSettings,
  useTelegramFinanceTestSend,
  useUpdateTelegramFinanceSettings,
  type TelegramFinanceSettingsDto,
} from "@/features/admin/hooks/useTelegramFinanceSettings";
import type { TelegramEnvVerifyDto } from "@/features/admin/lib/telegramEnvVerify";

export function TelegramFinanceSettingsCard() {
  const { data, isLoading, isError, error } = useTelegramFinanceSettings();
  const update = useUpdateTelegramFinanceSettings();
  const testSend = useTelegramFinanceTestSend();
  const [draft, setDraft] = React.useState<TelegramFinanceSettingsDto | null>(
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

  if (isError) {
    return (
      <section className="w-full rounded-xl border border-destructive/40 bg-card px-3 py-3 sm:px-4 sm:py-3.5">
        <p className="text-sm text-destructive">
          {(error as Error).message ?? "Could not load reminder settings"}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-xl border border-separator bg-card px-3 py-4 sm:px-4"
      aria-labelledby="finance-telegram-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="min-h-[44px] gap-2 sm:w-auto"
          onClick={() =>
            testSend.mutate(
              { action: "verify_finance_telegram_env" },
              {
                onSuccess: (j) => {
                  showTelegramVerifyToast(
                    j.verify as TelegramEnvVerifyDto | undefined,
                    "Finance group",
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
          <Wifi className="size-4 shrink-0" aria-hidden />
          Test connection
        </Button>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={busy}
          className="mt-1 size-[18px] accent-primary"
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            Send payment due reminders
          </span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            When off, no due-date messages are sent to the Finance group.
          </span>
        </span>
      </label>

      <TelegramTemplateEditor
        id="finance-tg-template"
        label="Default message"
        rows={6}
        minHeightClassName="min-h-[120px]"
        value={draft.defaultReminderTemplate}
        disabled={busy}
        previewSampleSet="finance"
        validPlaceholderKeys={validPlaceholderKeys}
        previewContext={{ bot: "finance" }}
        sendPreviewTitle="Send test with live transaction data."
        onChange={(v) => setDraft({ ...draft, defaultReminderTemplate: v })}
        onSendDraft={() =>
          testSend.mutate(
            {
              action: "send_draft_preview",
              text: draft.defaultReminderTemplate,
            },
            {
              onSuccess: (j) => {
                if (j.sent) {
                  toast.success("Preview sent");
                } else {
                  toast.error(
                    friendlyToastError(j.error, "Could not send preview"),
                  );
                }
              },
              onError: (e) =>
                toast.error(friendlyToastError(e, "Could not send preview")),
            },
          )
        }
      />

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          disabled={busy}
          className="min-h-[44px] w-full sm:w-auto"
          onClick={() =>
            update.mutate(
              {
                enabled: draft.enabled,
                defaultReminderTemplate: draft.defaultReminderTemplate,
                dailyCheckTimeManila: draft.dailyCheckTimeManila,
              },
              {
                onSuccess: ({ cronSync }) => {
                  toast.success("Settings saved");
                  if (cronSync && cronSync.ok !== true) {
                    toast.error(telegramScheduleSyncError());
                  }
                },
                onError: (e) =>
                  toast.error(friendlyToastError(e, "Could not save settings")),
              },
            )
          }
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}
