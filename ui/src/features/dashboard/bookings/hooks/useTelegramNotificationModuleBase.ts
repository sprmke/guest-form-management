import * as React from 'react';

import { toast } from 'sonner';

import {
  buildTelegramVerifyBody,
  telegramVerifySucceeded,
} from '@/features/dashboard/bookings/components/telegram-notifications/telegramCredentials';
import type { PropertyTelegramCredentialsStatus } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useTelegramCredentialAutoSave } from '@/features/dashboard/bookings/hooks/useTelegramCredentialAutoSave';
import { useTelegramCredentialFields } from '@/features/dashboard/bookings/hooks/useTelegramCredentialFields';
import { useTelegramModuleConnection } from '@/features/dashboard/bookings/hooks/useTelegramModuleConnection';
import { useTelegramNotificationsGlobalBot } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramNotificationsGlobalBotContext';
import type { TelegramEnvVerifyDto } from '@/features/dashboard/bookings/lib/telegramEnvVerify';
import { assetScopeKey, useAdminAssetScope } from '@/features/dashboard/org/lib/adminAssetScope';

import { friendlyToastError, showTelegramVerifyToast } from '@/lib/feedback/toastMessages';

type TelegramSettingsDtoBase = {
  enabled: boolean;
  credentials?: PropertyTelegramCredentialsStatus;
};

type VerifyHandlers = {
  silent?: boolean;
  onSuccess: (payload: { verify?: TelegramEnvVerifyDto }) => void;
  onError: () => void;
};

export type UpdateMutate = {
  mutate: (...args: any[]) => void;
  isPending: boolean;
};

export type TestSendMutate = {
  mutate: (...args: any[]) => void;
  isPending: boolean;
};

export function useTelegramNotificationModuleBase<TDto extends TelegramSettingsDtoBase>(config: {
  useSettings: () => {
    data?: TDto;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  useUpdate: () => UpdateMutate;
  useTestSend: () => TestSendMutate;
  verify: { action: string; groupLabel: string };
}) {
  const { useSettings, useUpdate, useTestSend, verify } = config;
  const { data, isLoading, isError, error } = useSettings();
  const globalBotToken = useTelegramNotificationsGlobalBot();
  const scope = useAdminAssetScope();
  const scopeKey = assetScopeKey(scope);
  const update = useUpdate();
  const testSend = useTestSend();
  const [draft, setDraft] = React.useState<TDto | null>(null);
  const { botToken, setBotToken, chatId, setChatId } = useTelegramCredentialFields(
    data?.credentials,
    globalBotToken
  );
  const saveCredentials = useTelegramCredentialAutoSave(botToken, chatId, update);

  React.useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const runVerify = React.useCallback(
    (handlers: VerifyHandlers) => {
      testSend.mutate(
        {
          action: verify.action,
          ...buildTelegramVerifyBody(botToken, chatId),
        },
        {
          onSuccess: (j: { verify?: TelegramEnvVerifyDto }) => {
            const verifyResult = j.verify as TelegramEnvVerifyDto | undefined;
            if (!handlers.silent) {
              showTelegramVerifyToast(verifyResult, verify.groupLabel);
            }
            handlers.onSuccess({ verify: verifyResult });
            if (
              !handlers.silent &&
              telegramVerifySucceeded(verifyResult) &&
              (botToken.trim() || chatId.trim())
            ) {
              saveCredentials();
            }
          },
          onError: (e: unknown) => {
            if (!handlers.silent) {
              toast.error(friendlyToastError(e, 'Could not verify the connection'));
            }
            handlers.onError();
          },
        }
      );
    },
    [testSend, verify.action, verify.groupLabel, botToken, chatId, saveCredentials]
  );

  const { connectionOk, triggerVerify } = useTelegramModuleConnection({
    scopeKey,
    credentialsStatus: data?.credentials,
    botToken,
    chatId,
    settingsVersion: data,
    runVerify,
  });

  const busy = isLoading || update.isPending || testSend.isPending;

  const onTestConnection = React.useCallback(() => {
    triggerVerify(false);
  }, [triggerVerify]);

  const onEnabledChange = React.useCallback(
    (enabled: boolean) => {
      if (enabled && !botToken.trim() && globalBotToken.trim()) {
        setBotToken(globalBotToken.trim());
      }
      setDraft((d) => (d ? { ...d, enabled } : d));
      update.mutate(
        { enabled },
        {
          onError: (e: unknown) => toast.error(friendlyToastError(e, 'Could not save settings')),
        }
      );
    },
    [botToken, globalBotToken, setBotToken, update]
  );

  return {
    draft,
    setDraft,
    botToken,
    setBotToken,
    chatId,
    setChatId,
    busy,
    connectionOk,
    onTestConnection,
    onEnabledChange,
    update,
    testSend,
    isError,
    error,
    isLoading,
    isReady: !isLoading && draft != null,
  };
}
