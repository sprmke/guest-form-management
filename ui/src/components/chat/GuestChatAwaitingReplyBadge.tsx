import { cn } from '@/lib/utils';

export function GuestChatAwaitingReplyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200',
        className
      )}
    >
      Awaiting reply
    </span>
  );
}
