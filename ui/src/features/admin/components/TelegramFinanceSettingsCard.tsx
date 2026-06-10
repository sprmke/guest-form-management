import * as React from 'react';
import { Bell, Send, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTelegramFinanceSettings,
  useTelegramFinanceTestSend,
  useUpdateTelegramFinanceSettings,
  type FinanceEnvVerifyDto,
  type TelegramFinanceSettingsDto,
} from '@/features/admin/hooks/useTelegramFinanceSettings';

function verifyToastMessage(v: FinanceEnvVerifyDto): {
  title: string;
  description: string;
} {
  if (!v.credentials.chatIdConfigured) {
    return {
      title: 'Finance group not configured',
      description: 'Ask your developer to connect the Finance Telegram group.',
    };
  }
  if (v.credentials.normalizeError) {
    return {
      title: 'Invalid group setup',
      description: v.credentials.normalizeError,
    };
  }
  if (!v.getMe.ok) {
    return {
      title: 'Bot not reachable',
      description:
        v.getMe.error ?? 'Check that the Telegram bot is set up correctly.',
    };
  }
  if (!v.getChat.ok) {
    return {
      title: 'Cannot access Finance group',
      description:
        v.getChat.error ?? 'Make sure the bot was added to the group.',
    };
  }
  const groupName = v.getChat.title ?? 'Finance group';
  const bot = v.getMe.username ? `@${v.getMe.username}` : 'Bot';
  return {
    title: 'Connection looks good',
    description: `${bot} can post to “${groupName}”.`,
  };
}

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

  if (isError) {
    return (
      <section className="px-4 py-4 w-full surface-card">
        <p className="text-sm text-destructive">
          {(error as Error).message ?? 'Could not load reminder settings'}
        </p>
      </section>
    );
  }

  if (isLoading || !draft) {
    return (
      <section className="px-4 py-4 w-full surface-card">
        <div className="h-48 rounded-xl animate-pulse bg-muted/50" />
      </section>
    );
  }

  return (
    <section
      className="px-4 py-4 w-full surface-card sm:px-5 sm:py-5"
      aria-labelledby="finance-telegram-heading"
    >
      <div className="space-y-4">
        <AdminPageHeader
          id="finance-telegram-heading"
          title="Finance Telegram reminders"
          subtitle="Payment-due alerts for operating expenses and income."
          icon={Bell}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-[44px] w-full gap-2 sm:w-auto"
            onClick={() =>
              testSend.mutate(
                { action: 'verify_finance_telegram_env' },
                {
                  onSuccess: (j) => {
                    const v = j.verify as FinanceEnvVerifyDto | undefined;
                    if (!v) {
                      toast.error('Could not verify the connection');
                      return;
                    }
                    const msg = verifyToastMessage(v);
                    if (v.getMe.ok && v.getChat.ok) {
                      toast.success(msg.title, {
                        description: msg.description,
                      });
                    } else {
                      toast.error(msg.title, { description: msg.description });
                    }
                  },
                  onError: (e) => toast.error((e as Error).message),
                },
              )
            }
          >
            <Wifi className="size-4 shrink-0" aria-hidden />
            Test connection
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() =>
              testSend.mutate(
                { action: 'send_test_due_reminders' },
                {
                  onSuccess: (j) => {
                    const r = j.result as
                      | { sent?: number; matched?: number; skipped?: boolean }
                      | undefined;
                    if (r?.skipped) {
                      toast.message('Reminders are turned off', {
                        description: 'Enable reminders below, then try again.',
                      });
                      return;
                    }
                    const sent = r?.sent ?? 0;
                    if (sent === 0) {
                      toast.message('Nothing to send right now', {
                        description:
                          'No transactions are due for a reminder at this moment.',
                      });
                      return;
                    }
                    toast.success(
                      sent === 1 ? 'Sent 1 reminder' : `Sent ${sent} reminders`,
                    );
                  },
                  onError: (e) => toast.error((e as Error).message),
                },
              )
            }
          >
            Send due reminders now
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

        <div className="space-y-1.5">
          <Label htmlFor="finance-tg-template" className="text-overline">
            Default message
          </Label>
          <Textarea
            id="finance-tg-template"
            rows={6}
            disabled={busy}
            className="text-sm"
            value={draft.defaultReminderTemplate}
            onChange={(e) =>
              setDraft({ ...draft, defaultReminderTemplate: e.target.value })
            }
          />
          <p className="text-caption text-muted-foreground">
            You can include{' '}
            <span className="font-mono text-[11px]">{'{{label}}'}</span>,{' '}
            <span className="font-mono text-[11px]">{'{{due_date}}'}</span>,{' '}
            <span className="font-mono text-[11px]">{'{{amount}}'}</span>, and{' '}
            <span className="font-mono text-[11px]">{'{{category}}'}</span> —
            they fill in automatically for each transaction.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            className="min-h-[44px] gap-2"
            onClick={() =>
              testSend.mutate(
                {
                  action: 'send_draft_preview',
                  text: draft.defaultReminderTemplate,
                },
                {
                  onSuccess: (j) => {
                    if (j.sent) {
                      toast.success('Preview sent to the Finance group');
                    } else {
                      toast.error(String(j.error ?? 'Could not send preview'));
                    }
                  },
                  onError: (e) => toast.error((e as Error).message),
                },
              )
            }
          >
            <Send className="size-4" aria-hidden />
            Send preview
          </Button>
        </div>

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
                    toast.success('Settings saved');
                    if (cronSync && cronSync.ok !== true) {
                      toast.error(
                        cronSync.error ??
                          'Settings saved, but the reminder schedule could not be updated.',
                      );
                    }
                  },
                  onError: (e) => toast.error((e as Error).message),
                },
              )
            }
          >
            Save settings
          </Button>
        </div>
      </div>
    </section>
  );
}
