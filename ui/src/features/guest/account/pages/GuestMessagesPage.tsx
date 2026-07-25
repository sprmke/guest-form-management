import { GuestAccountEmptyState } from '@/features/guest/account/components/GuestAccountEmptyState';
import {
  GUEST_MESSAGES_HUB_SHELL_CLASS,
  GuestMessagesHub,
} from '@/features/guest/account/components/GuestMessagesHub';
import { useGuestMessages } from '@/features/guest/account/hooks/useGuestMessages';

import { cn } from '@/lib/utils';

export function GuestMessagesPage() {
  const { data, isLoading, isError } = useGuestMessages();
  const threads = data?.threads ?? [];

  if (isLoading) {
    return <div className={cn('bg-muted animate-pulse', GUEST_MESSAGES_HUB_SHELL_CLASS)} />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">Could not load messages.</p>;
  }

  if (threads.length === 0) {
    return (
      <GuestAccountEmptyState
        message="No messages yet."
        actionLabel="Browse properties"
        actionHref="/properties"
      />
    );
  }

  return <GuestMessagesHub threads={threads} />;
}
