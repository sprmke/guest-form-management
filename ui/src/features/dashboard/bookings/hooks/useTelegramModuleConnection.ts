import * as React from 'react';

import { telegramVerifySucceeded } from '@/features/dashboard/bookings/components/telegram-notifications/telegramCredentials';
import type { PropertyTelegramCredentialsStatus } from '@/features/dashboard/bookings/hooks/useAppSettings';

type VerifyPayload = {
  verify?: Parameters<typeof telegramVerifySucceeded>[0];
};

type VerifyHandlers = {
  silent?: boolean;
  onSuccess: (payload: VerifyPayload) => void;
  onError: () => void;
};

function credentialsDraftDiffersFromServer(
  status: PropertyTelegramCredentialsStatus | undefined,
  botToken: string,
  chatId: string
): boolean {
  if (!status?.tokenConfigured || !status?.chatIdConfigured) {
    return false;
  }
  if (status.botToken == null && status.chatId == null) {
    return false;
  }
  return (
    botToken.trim() !== (status.botToken ?? '').trim() ||
    chatId.trim() !== (status.chatId ?? '').trim()
  );
}

export function useTelegramModuleConnection(options: {
  scopeKey?: string | null;
  credentialsStatus?: PropertyTelegramCredentialsStatus;
  botToken: string;
  chatId: string;
  /** Bumps when server settings reload (e.g. React Query `data`). */
  settingsVersion: unknown;
  runVerify: (handlers: VerifyHandlers) => void;
}) {
  const { scopeKey, credentialsStatus, botToken, chatId, settingsVersion, runVerify } = options;
  const [connectionOk, setConnectionOk] = React.useState<boolean | null>(null);
  const autoVerifiedKeyRef = React.useRef<string | null>(null);
  const scopeKeyRef = React.useRef(scopeKey);
  const prevCredentialFieldsRef = React.useRef({ botToken: '', chatId: '' });

  const applyVerifyResult = React.useCallback((payload: VerifyPayload) => {
    setConnectionOk(telegramVerifySucceeded(payload.verify));
  }, []);

  const triggerVerify = React.useCallback(
    (silent = false) => {
      runVerify({
        silent,
        onSuccess: applyVerifyResult,
        onError: () => {
          setConnectionOk(false);
        },
      });
    },
    [applyVerifyResult, runVerify]
  );

  React.useEffect(() => {
    autoVerifiedKeyRef.current = null;

    const scopeChanged = scopeKeyRef.current !== scopeKey;
    if (scopeChanged) {
      scopeKeyRef.current = scopeKey;
      setConnectionOk(null);
      return;
    }

    const configured =
      Boolean(credentialsStatus?.tokenConfigured) && Boolean(credentialsStatus?.chatIdConfigured);

    if (!configured) {
      setConnectionOk(null);
    }
  }, [
    scopeKey,
    settingsVersion,
    credentialsStatus?.tokenConfigured,
    credentialsStatus?.chatIdConfigured,
  ]);

  React.useEffect(() => {
    const prev = prevCredentialFieldsRef.current;
    const changed =
      botToken.trim() !== prev.botToken.trim() || chatId.trim() !== prev.chatId.trim();
    prevCredentialFieldsRef.current = { botToken, chatId };

    if (!changed) return;

    const savedOnServer =
      Boolean(credentialsStatus?.tokenConfigured) && Boolean(credentialsStatus?.chatIdConfigured);

    if (!savedOnServer) {
      setConnectionOk(null);
      return;
    }

    if (credentialsDraftDiffersFromServer(credentialsStatus, botToken, chatId)) {
      setConnectionOk(null);
    }
  }, [botToken, chatId, credentialsStatus]);

  React.useEffect(() => {
    const configured =
      Boolean(credentialsStatus?.tokenConfigured) && Boolean(credentialsStatus?.chatIdConfigured);
    if (!configured) return;

    const serverToken = credentialsStatus?.botToken ?? '';
    const serverChat = credentialsStatus?.chatId ?? '';
    const hasServerValues =
      credentialsStatus?.botToken != null && credentialsStatus?.chatId != null;
    const draftMatchesServer =
      hasServerValues &&
      botToken.trim() === serverToken.trim() &&
      chatId.trim() === serverChat.trim();

    if (hasServerValues && !draftMatchesServer) return;

    const key = String(settingsVersion ?? '');
    if (autoVerifiedKeyRef.current === key) return;
    autoVerifiedKeyRef.current = key;

    triggerVerify(true);
  }, [
    botToken,
    chatId,
    credentialsStatus?.botToken,
    credentialsStatus?.chatId,
    credentialsStatus?.chatIdConfigured,
    credentialsStatus?.tokenConfigured,
    settingsVersion,
    triggerVerify,
  ]);

  return { connectionOk, setConnectionOk, triggerVerify };
}
