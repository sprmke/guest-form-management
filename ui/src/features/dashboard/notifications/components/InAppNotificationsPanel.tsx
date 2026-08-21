import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { PlatformLogo } from '@/features/dashboard/inbox/components/PlatformLogo';
import { NotificationInboxTitle } from '@/features/dashboard/notifications/components/NotificationInboxTitle';
import {
  useMarkNotificationRead,
  useNotificationsList,
  type NotificationsListMode,
} from '@/features/dashboard/notifications/hooks/useNotifications';
import { useEnrichedNotifications } from '@/features/dashboard/notifications/hooks/useEnrichedNotifications';
import type { NotificationRecord } from '@/features/dashboard/notifications/lib/notificationsApi';
import { collapseInboxNotifications } from '@/features/dashboard/notifications/lib/notificationsCollapse';
import {
  formatNotificationDisplayTitle,
  formatNotificationInboxPlatformLabel,
  formatNotificationStayLabel,
  notificationIconFor,
  notificationInboxPlatform,
} from '@/features/dashboard/notifications/lib/notificationsDisplay';
import {
  resolveNotificationPath,
  type NotificationPathScope,
} from '@/features/dashboard/notifications/lib/notificationsPaths';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Bounded list height on the Notifications page — scroll inside the card, not the page. */
const PAGE_LIST_MAX_HEIGHT_CLASS = 'max-h-[min(28rem,60vh)]';

type Props = {
  mode: NotificationsListMode;
  pathScope: NotificationPathScope;
  className?: string;
  /** Sheet (bell panel), dropdown (legacy), or full page list. */
  variant?: 'sheet' | 'dropdown' | 'page';
  onNavigate?: () => void;
};

export function InAppNotificationsPanel({
  mode,
  pathScope,
  className,
  variant = 'page',
  onNavigate,
}: Props) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useNotificationsList(mode);
  const markRead = useMarkNotificationRead();

  const rawNotifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const enrichedNotifications = useEnrichedNotifications(rawNotifications);
  const notifications = collapseInboxNotifications(enrichedNotifications);
  const hasMoreOnServer = Boolean(data?.pages[0]?.nextCursor);

  loadingMoreRef.current = isFetchingNextPage;

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || loadingMoreRef.current) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage]);

  useEffect(() => {
    if (variant !== 'page' || !hasNextPage) return;

    const sentinel = sentinelRef.current;
    const scrollRoot = scrollRef.current;
    if (!sentinel || !scrollRoot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMoreRef.current) {
          handleLoadMore();
        }
      },
      { root: scrollRoot, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [variant, hasNextPage, handleLoadMore, notifications.length]);

  const handleRowClick = (notification: NotificationRecord) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    const path = resolveNotificationPath(notification, pathScope);
    if (path) {
      onNavigate?.();
      navigate(path);
    }
  };

  const listScrollClassName = useMemo(() => {
    if (variant === 'sheet') {
      return 'min-h-0 flex-1 overflow-y-auto overscroll-contain';
    }
    if (variant === 'dropdown') {
      return 'max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain';
    }
    return cn(PAGE_LIST_MAX_HEIGHT_CLASS, 'overflow-y-auto overscroll-contain');
  }, [variant]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-10', className)}>
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn('space-y-3 px-4 py-6 text-center', className)}>
        <p className="text-muted-foreground text-sm">Could not load notifications.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className={cn('text-muted-foreground px-4 py-8 text-center text-sm', className)}>
        No notifications yet.
      </p>
    );
  }

  return (
    <div
      className={cn('min-w-0', variant === 'sheet' && 'flex min-h-0 flex-1 flex-col', className)}
    >
      <div ref={scrollRef} className={listScrollClassName}>
        <ul className={variant === 'page' ? 'divide-border/60 divide-y' : undefined}>
          {notifications.map((notification) => {
            const Icon = notificationIconFor(notification.type);
            const stayLabel = formatNotificationStayLabel(notification.metadata);
            const inboxPlatform = notificationInboxPlatform(notification.metadata);
            const platformLabel = formatNotificationInboxPlatformLabel(notification.metadata);
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleRowClick(notification)}
                  className={cn(
                    'hover:bg-muted/60 flex min-h-[44px] w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    !notification.isRead && 'bg-primary/5',
                    variant === 'page' && 'py-3.5'
                  )}
                >
                  {notification.type === 'inbox_new_message' && inboxPlatform ? (
                    <PlatformLogo
                      platform={inboxPlatform}
                      size="xs"
                      className="mt-0.5 size-8 shrink-0 rounded-full"
                    />
                  ) : (
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        notification.isRead
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      {notification.type === 'inbox_new_message' && platformLabel ? (
                        <NotificationInboxTitle
                          name={formatNotificationDisplayTitle(notification)}
                          platformLabel={platformLabel}
                          nameClassName={cn(
                            'text-sm',
                            notification.isRead ? 'font-medium' : 'font-semibold'
                          )}
                        />
                      ) : (
                        <span
                          className={cn(
                            'truncate text-sm',
                            notification.isRead ? 'font-medium' : 'font-semibold'
                          )}
                        >
                          {formatNotificationDisplayTitle(notification)}
                        </span>
                      )}
                      {!notification.isRead ? (
                        <span
                          className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    {stayLabel ? (
                      <span className="text-muted-foreground mt-0.5 block text-xs tabular-nums">
                        {stayLabel}
                      </span>
                    ) : null}
                    {notification.body ? (
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
                        {notification.body}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground mt-1 block text-[11px]">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {variant === 'page' && (hasNextPage || isFetchingNextPage) ? (
          <div
            ref={sentinelRef}
            className="flex min-h-[48px] items-center justify-center px-4 py-3"
            role="status"
            aria-live="polite"
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" aria-hidden />
            ) : null}
          </div>
        ) : null}
      </div>

      {(variant === 'sheet' || variant === 'dropdown') && mode === 'preview' && hasMoreOnServer ? (
        <span className="sr-only">More notifications available on the Notifications page.</span>
      ) : null}
    </div>
  );
}
