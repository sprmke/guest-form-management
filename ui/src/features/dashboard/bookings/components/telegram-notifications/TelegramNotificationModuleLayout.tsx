import * as React from 'react';

import { Activity, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';

import { PropertyTelegramCredentialsFields } from '@/features/dashboard/bookings/components/PropertyTelegramCredentialsFields';
import { telegramCredentialsReady } from '@/features/dashboard/bookings/components/telegram-notifications/telegramCredentials';
import { TelegramToggleRow } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramToggleRow';
import type { PropertyTelegramCredentialsStatus } from '@/features/dashboard/bookings/hooks/useAppSettings';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  moduleId?: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  enableLabel: string;
  enableDescription?: string;
  disabled?: boolean;
  botToken: string;
  chatId: string;
  credentialsStatus?: PropertyTelegramCredentialsStatus;
  onBotTokenChange: (value: string) => void;
  onChatIdChange: (value: string) => void;
  onTestConnection: () => void;
  testPending?: boolean;
  /** null = not tested this session; true/false = last result */
  connectionOk?: boolean | null;
  /** Shown when connected; wraps manage rows (Schedule, templates, etc.). */
  manageSectionTitle?: string;
  children?: React.ReactNode;
};

export function TelegramNotificationModuleLayout({
  moduleId = 'tg-module',
  enabled,
  onEnabledChange,
  enableLabel,
  enableDescription,
  disabled,
  botToken,
  chatId,
  credentialsStatus,
  onBotTokenChange,
  onChatIdChange,
  onTestConnection,
  testPending,
  connectionOk = null,
  manageSectionTitle = 'Notification Controls',
  children,
}: Props) {
  const credentialsReady = telegramCredentialsReady(credentialsStatus, botToken, chatId);
  const canManage = enabled && connectionOk === true;
  const isConnected = connectionOk === true;

  const connectButton = (
    <Button
      type="button"
      variant={isConnected ? 'success' : connectionOk === false ? 'outline-destructive' : 'outline'}
      disabled={disabled || testPending || !credentialsReady || isConnected}
      className={cn(
        'min-h-[44px] w-full gap-2 md:w-auto md:min-w-[7.5rem]',
        isConnected && !testPending && 'pointer-events-none opacity-100'
      )}
      aria-label={
        isConnected
          ? 'Telegram connected'
          : testPending
            ? 'Connecting Telegram'
            : connectionOk === false
              ? 'Retry Telegram connection'
              : 'Connect Telegram'
      }
      onClick={onTestConnection}
    >
      {isConnected ? (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      ) : testPending ? (
        <Activity className="size-4 shrink-0 animate-pulse" aria-hidden />
      ) : (
        <Wifi className="size-4 shrink-0" aria-hidden />
      )}
      {isConnected ? 'Connected' : testPending ? 'Connecting…' : 'Connect'}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="border-border/60 bg-card rounded-xl border px-3 py-2 sm:px-4">
        <TelegramToggleRow
          id={`${moduleId}-enabled`}
          label={enableLabel}
          hint={enableDescription}
          checked={enabled}
          disabled={disabled}
          compact
          onChange={onEnabledChange}
        />
      </div>

      {enabled ? (
        <div className="border-border/60 bg-card space-y-3 rounded-xl border px-3 py-4 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-foreground text-sm font-semibold">Telegram connection</p>
            {connectionOk === false ? (
              <span className="text-destructive inline-flex items-center gap-1.5 text-xs font-medium">
                <AlertCircle className="size-3.5" aria-hidden />
                Connection failed
              </span>
            ) : null}
          </div>

          <PropertyTelegramCredentialsFields
            idPrefix={moduleId}
            botToken={botToken}
            chatId={chatId}
            status={credentialsStatus}
            disabled={disabled}
            onBotTokenChange={onBotTokenChange}
            onChatIdChange={onChatIdChange}
            connectAction={connectButton}
          />
        </div>
      ) : null}

      {canManage ? (
        <div className="border-border/60 bg-card space-y-3 rounded-xl border px-3 py-4 sm:px-4">
          <p className="text-foreground text-sm font-semibold">{manageSectionTitle}</p>
          <div className="space-y-2">
            {React.Children.map(children, (child) =>
              React.isValidElement<{ nested?: boolean }>(child)
                ? React.cloneElement(child, { nested: true })
                : child
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
