import * as React from 'react';

import type { PropertyTelegramCredentialsStatus } from '@/features/dashboard/bookings/hooks/useAppSettings';

/** Local bot token / chat id fields synced from server when saved credentials change. */
export function useTelegramCredentialFields(
  credentials: PropertyTelegramCredentialsStatus | undefined
) {
  const [botToken, setBotToken] = React.useState('');
  const [chatId, setChatId] = React.useState('');

  const serverToken = credentials?.botToken ?? '';
  const serverChat = credentials?.chatId ?? '';

  React.useEffect(() => {
    setBotToken(serverToken);
    setChatId(serverChat);
  }, [serverToken, serverChat]);

  return { botToken, setBotToken, chatId, setChatId };
}
