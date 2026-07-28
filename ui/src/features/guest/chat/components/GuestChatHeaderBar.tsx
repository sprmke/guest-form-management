import type { ReactNode } from 'react';

import { MoreVertical, Search } from 'lucide-react';

import { ChatThreadSearchPanel } from '@/components/chat/ChatThreadSearch';
import { GuestChatAwaitingReplyBadge } from '@/components/chat/GuestChatAwaitingReplyBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isAwaitingHostReply } from '@/lib/chat/chatReplyStatus';
import type { ChatThreadSearchController } from '@/lib/chat/useChatThreadSearch';
import { cn } from '@/lib/utils';

type HeaderProps = {
  leading?: ReactNode;
  avatar: ReactNode;
  title: string;
  subtitle?: string | null;
  replyStatus?: string | null;
  threadSearch: ChatThreadSearchController;
  searchEnabled?: boolean;
  /** e.g. inline dialog close — rendered after the options menu. */
  trailing?: ReactNode;
  className?: string;
};

const headerIconButtonClass =
  'text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex size-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-colors';

/** Guest chat identity row — options menu inline with host info. */
export function GuestChatHeaderBar({
  leading,
  avatar,
  title,
  subtitle,
  replyStatus,
  threadSearch,
  searchEnabled = true,
  trailing,
  className,
}: HeaderProps) {
  const awaitingReply = isAwaitingHostReply(replyStatus);

  return (
    <div className={cn('flex min-w-0 flex-nowrap items-center gap-2 sm:gap-2.5', className)}>
      {leading}
      {avatar}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-foreground truncate text-sm font-semibold leading-tight">{title}</p>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-xs leading-tight">{subtitle}</p>
        ) : null}
        {awaitingReply ? <GuestChatAwaitingReplyBadge className="mt-0.5" /> : null}
      </div>
      {searchEnabled ? (
        <DropdownMenu modal>
          <DropdownMenuTrigger asChild>
            <button type="button" className={headerIconButtonClass} aria-label="Chat options">
              <MoreVertical className="size-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="z-[110] min-w-[9rem]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuItem
              onSelect={() => {
                threadSearch.openSearch();
              }}
            >
              <Search className="size-4" aria-hidden />
              Search
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {trailing}
    </div>
  );
}

export { headerIconButtonClass };

/** Full-width search row below the guest chat header (same pattern as host inbox). */
export function GuestChatSearchPanelRow({
  threadSearch,
  className,
}: {
  threadSearch: ChatThreadSearchController;
  className?: string;
}) {
  if (!threadSearch.open) return null;

  return (
    <ChatThreadSearchPanel
      query={threadSearch.query}
      onQueryChange={threadSearch.setQuery}
      matchCount={threadSearch.matches.length}
      activeIndex={threadSearch.activeIndex}
      onPrev={threadSearch.goPrev}
      onNext={threadSearch.goNext}
      onClose={threadSearch.close}
      className={cn('shrink-0', className)}
    />
  );
}
