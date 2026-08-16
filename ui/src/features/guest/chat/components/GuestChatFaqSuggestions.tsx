import { useMemo } from 'react';

import {
  GUEST_CHAT_FAQ_VISIBLE_COUNT,
  pickRandomGuestChatFaqs,
} from '@/features/guest/chat/lib/guestChatSuggestions';

import { ChatSuggestionList } from '@/components/chat/ChatSuggestionList';

type Props = {
  onPick: (prompt: string) => void;
  disabled?: boolean;
};

export function GuestChatFaqSuggestions({ onPick, disabled }: Props) {
  const suggestions = useMemo(() => pickRandomGuestChatFaqs(GUEST_CHAT_FAQ_VISIBLE_COUNT), []);

  if (suggestions.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Suggested questions"
      aria-busy={disabled || undefined}
      className="flex min-h-full flex-1 flex-col px-4 py-6"
    >
      <div className="m-auto flex w-full min-w-0 max-w-[22rem] flex-col">
        <ChatSuggestionList suggestions={suggestions} onPick={onPick} disabled={disabled} />
      </div>
    </div>
  );
}
