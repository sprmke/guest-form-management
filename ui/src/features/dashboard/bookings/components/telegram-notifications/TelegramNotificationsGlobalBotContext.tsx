import * as React from 'react';

import { useTelegramGlobalBotToken } from '@/features/dashboard/bookings/hooks/useTelegramGlobalBotToken';

const TelegramNotificationsGlobalBotContext = React.createContext('');

export function TelegramNotificationsGlobalBotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useTelegramGlobalBotToken();
  const value = data?.botToken?.trim() ?? '';

  return (
    <TelegramNotificationsGlobalBotContext.Provider value={value}>
      {children}
    </TelegramNotificationsGlobalBotContext.Provider>
  );
}

export function useTelegramNotificationsGlobalBot(): string {
  return React.useContext(TelegramNotificationsGlobalBotContext);
}
