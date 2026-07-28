import * as React from 'react';

import { Eye, EyeOff } from 'lucide-react';

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
  onChange: (value: string) => void;
  className?: string;
};

function SecretInput({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
  className,
}: SecretInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
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
    <div
      className={cn(
        'grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end',
        className
      )}
    >
      <SecretInput
        id={botTokenId}
        label="Bot token"
        value={botToken}
        disabled={disabled}
        placeholder={telegramBotTokenPlaceholder(Boolean(status?.tokenConfigured))}
        onChange={onBotTokenChange}
      />

      <SecretInput
        id={chatIdId}
        label="Chat ID"
        value={chatId}
        disabled={disabled}
        placeholder={telegramChatIdPlaceholder(Boolean(status?.chatIdConfigured))}
        onChange={onChatIdChange}
      />

      {connectAction ? <div className="min-w-0 md:justify-self-end">{connectAction}</div> : null}
    </div>
  );
}
