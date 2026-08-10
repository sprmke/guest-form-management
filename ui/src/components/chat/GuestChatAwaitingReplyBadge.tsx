import { cn } from '@/lib/utils';
import { softBadgeClasses } from '@/lib/status-tone-colors';

export function GuestChatAwaitingReplyBadge({ className }: { className?: string }) {
  return <span className={cn(softBadgeClasses('pending'), className)}>Awaiting reply</span>;
}
