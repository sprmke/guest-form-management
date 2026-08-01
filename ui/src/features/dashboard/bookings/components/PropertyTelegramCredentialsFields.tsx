import * as React from 'react';

import { Eye, EyeOff } from 'lucide-react';

import { TelegramChatIdFinder } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramChatIdFinder';
import {
  TelegramHelpDialog,
  type TelegramHelpTab,
} from '@/features/dashboard/bookings/components/telegram-notifications/TelegramHelpDialog';
import {
  telegramBotTokenPlaceholder,
  telegramChatIdPlaceholder,
} from '@/features/dashboard/bookings/components/telegram-notifications/telegramCredentials';
import type { PropertyTelegramCredentialsStatus } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { SETTINGS_FIELD_LABEL_COMPACT } from '@/features/dashboard/org/lib/settingsFieldLabel';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type { PropertyTelegramCredentialsStatus };

const FIELD_LABEL = SETTINGS_FIELD_LABEL_COMPACT;

type SecretInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  helpTab?: TelegramHelpTab;
  onChange: (value: string) => void;
  className?: string;
};

function SecretInput({
  id,
  label,
  value,
  placeholder,
  disabled,
  helpTab,
  onChange,
  className,
}: SecretInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-center gap-0.5">
        <Label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </Label>
        {helpTab ? <TelegramHelpDialog defaultTab={helpTab} variant="icon" /> : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 pr-11"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-lg transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="size-4 shrink-0" aria-hidden />
          ) : (
            <Eye className="size-4 shrink-0" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

interface PropertyTelegramCredentialsFieldsProps {
  botToken: string;
  chatId: string;
  status?: PropertyTelegramCredentialsStatus;
  disabled?: boolean;
  onBotTokenChange: (value: string) => void;
  onChatIdChange: (value: string) => void;
  idPrefix?: string;
  connectAction?: React.ReactNode;
  className?: string;
}

export function PropertyTelegramCredentialsFields({
  botToken,
  chatId,
  status,
  disabled,
  onBotTokenChange,
  onChatIdChange,
  idPrefix = 'telegram',
  connectAction,
  className,
}: PropertyTelegramCredentialsFieldsProps) {
  const botTokenId = `${idPrefix}-bot-token`;
  const chatIdId = `${idPrefix}-chat-id`;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <SecretInput
          id={botTokenId}
          label="Bot token"
          value={botToken}
          disabled={disabled}
          helpTab="bot-token"
          placeholder={telegramBotTokenPlaceholder(Boolean(status?.tokenConfigured))}
          onChange={onBotTokenChange}
        />

        <SecretInput
          id={chatIdId}
          label="Chat ID"
          value={chatId}
          disabled={disabled}
          helpTab="chat-id"
          placeholder={telegramChatIdPlaceholder(Boolean(status?.chatIdConfigured))}
          onChange={onChatIdChange}
        />

        {connectAction ? <div className="min-w-0 md:justify-self-end">{connectAction}</div> : null}
      </div>

      <TelegramChatIdFinder
        botToken={botToken}
        chatId={chatId}
        disabled={disabled}
        onChatIdSelect={onChatIdChange}
      />
    </div>
  );
}
