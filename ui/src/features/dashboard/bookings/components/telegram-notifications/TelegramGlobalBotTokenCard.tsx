import * as React from 'react';

import { Activity, Bot, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { TelegramHelpDialog } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramHelpDialog';
import { telegramBotTokenPlaceholder } from '@/features/dashboard/bookings/components/telegram-notifications/telegramCredentials';
import {
  useTelegramGlobalBotToken,
  useUpdateTelegramGlobalBotToken,
  useVerifyTelegramGlobalBotToken,
} from '@/features/dashboard/bookings/hooks/useTelegramGlobalBotToken';
import { TELEGRAM_BOT_TOKEN_HELP } from '@/features/dashboard/bookings/lib/telegramHelpContent';
import { SETTINGS_FIELD_LABEL_COMPACT } from '@/features/dashboard/org/lib/settingsFieldLabel';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

export function TelegramGlobalBotTokenCard() {
  const { data, isLoading } = useTelegramGlobalBotToken();
  const save = useUpdateTelegramGlobalBotToken();
  const verify = useVerifyTelegramGlobalBotToken();
  const [botToken, setBotToken] = React.useState('');
  const [visible, setVisible] = React.useState(false);
  const [tokenOk, setTokenOk] = React.useState<boolean | null>(null);

  const serverToken = data?.botToken ?? '';

  React.useEffect(() => {
    setBotToken(serverToken);
    setTokenOk(null);
  }, [serverToken]);

  const busy = isLoading || save.isPending || verify.isPending;
  const trimmed = botToken.trim();
  const dirty = trimmed !== serverToken.trim();

  const onTest = () => {
    if (!trimmed) {
      toast.error('Enter a bot token first');
      return;
    }
    verify.mutate(trimmed, {
      onSuccess: (result) => {
        const ok = Boolean(result.verify?.getMe?.ok);
        setTokenOk(ok);
        if (ok) {
          const username = result.verify?.getMe?.username;
          toast.success(username ? `Valid — @${username}` : 'Bot token is valid');
        } else {
          toast.error(
            friendlyToastError(
              result.verify?.getMe?.error,
              'Check that the Telegram bot token is correct'
            )
          );
        }
      },
      onError: (e) => {
        setTokenOk(false);
        toast.error(friendlyToastError(e, 'Could not verify bot token'));
      },
    });
  };

  const onSave = () => {
    save.mutate(trimmed || null, {
      onSuccess: () => {
        toast.success('Shared bot token saved');
        setTokenOk(null);
      },
      onError: (e) => toast.error(friendlyToastError(e, 'Could not save shared bot token')),
    });
  };

  return (
    <Card id="section-global-bot" className="scroll-mt-2">
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="size-5 shrink-0" aria-hidden />
            Shared bot token
          </CardTitle>
          <TelegramHelpDialog
            title="How to get a Telegram bot token"
            sections={TELEGRAM_BOT_TOKEN_HELP}
          />
        </div>
        <CardDescription>
          One bot token for all notification modules. New modules pre-fill this value — you can
          still override per module.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full max-w-xl" aria-label="Loading shared bot token" />
        ) : (
          <div className="flex flex-col gap-3 sm:max-w-xl">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="global-bot-token" className={SETTINGS_FIELD_LABEL_COMPACT}>
                Bot token
              </Label>
              <div className="relative">
                <Input
                  id="global-bot-token"
                  type={visible ? 'text' : 'password'}
                  autoComplete="off"
                  value={botToken}
                  disabled={busy}
                  placeholder={telegramBotTokenPlaceholder(Boolean(data?.tokenConfigured))}
                  onChange={(e) => {
                    setBotToken(e.target.value);
                    setTokenOk(null);
                  }}
                  className="h-10 pr-11"
                />
                <button
                  type="button"
                  disabled={busy}
                  aria-label={visible ? 'Hide bot token' : 'Show bot token'}
                  onClick={() => setVisible((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute right-0 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-lg transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {visible ? (
                    <EyeOff className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <Eye className="size-4 shrink-0" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !trimmed}
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={onTest}
              >
                {verify.isPending ? (
                  <Activity className="size-4 shrink-0 animate-pulse" aria-hidden />
                ) : tokenOk === true ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : null}
                {verify.isPending ? 'Testing…' : 'Test token'}
              </Button>
              <Button
                type="button"
                disabled={busy || !dirty}
                className="min-h-[44px] w-full sm:w-auto"
                onClick={onSave}
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              {tokenOk === true && !verify.isPending ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                  Token verified
                </span>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
