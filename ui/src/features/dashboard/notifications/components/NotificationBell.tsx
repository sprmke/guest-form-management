import { useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { Bell, Loader2, X } from 'lucide-react';

import { InAppNotificationsPanel } from '@/features/dashboard/notifications/components/InAppNotificationsPanel';
import {
  useMarkAllNotificationsRead,
  useNotificationsList,
} from '@/features/dashboard/notifications/hooks/useNotifications';
import {
  notificationsHubActivityHash,
  useNotificationsHubPath,
} from '@/features/dashboard/notifications/lib/notificationsPaths';
import { useNotificationsOrgScope } from '@/features/dashboard/notifications/lib/notificationsScope';
import { useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';

import { BottomSheetContent } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const NOTIFICATIONS_PANEL_Z = 'z-[110]';

type Props = {
  /** Render against a brand-colored surface (mobile hero band) instead of the default chrome. */
  onPrimary?: boolean;
  /** Desktop floating action — hidden below `lg`; mobile uses the bottom tab. */
  variant?: 'ghost' | 'fab';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function NotificationBell({
  onPrimary = false,
  variant = 'ghost',
  open: openProp,
  onOpenChange,
  className,
}: Props = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const isMobile = useIsBelowLg();
  const hubPath = useNotificationsHubPath();
  const { orgSlug } = useNotificationsOrgScope();

  const { data: propertiesData } = useProperties(orgSlug ?? undefined);
  const { data: parkingsData } = useParkings(orgSlug ?? undefined);

  const propertySlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const property of propertiesData?.properties ?? []) map.set(property.id, property.slug);
    return map;
  }, [propertiesData]);

  const parkingSlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const parking of parkingsData?.parkings ?? []) map.set(parking.id, parking.slug);
    return map;
  }, [parkingsData]);

  const pathScope = useMemo(
    () => ({ orgSlug, propertySlugById, parkingSlugById }),
    [orgSlug, propertySlugById, parkingSlugById]
  );

  const { data, isLoading, isError, refetch } = useNotificationsList('preview');
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const hasMoreOnServer = Boolean(data?.pages[0]?.nextCursor);
  const viewAllPath = hubPath ? `${hubPath}${notificationsHubActivityHash()}` : null;
  const ariaLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  const panelBody = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border/50 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <SheetTitle className="text-sm font-semibold leading-none">Notifications</SheetTitle>
        <div className="flex shrink-0 items-center gap-1">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-primary min-h-[44px] px-2 text-xs font-semibold hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" aria-hidden />
          <span className="sr-only">Loading notifications</span>
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <p className="text-muted-foreground text-sm">Could not load notifications.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <InAppNotificationsPanel
          mode="preview"
          pathScope={pathScope}
          variant="sheet"
          onNavigate={() => setOpen(false)}
        />
      )}

      {viewAllPath && hasMoreOnServer ? (
        <Link
          to={viewAllPath}
          onClick={() => setOpen(false)}
          className="text-primary border-border/50 hover:bg-muted/50 flex min-h-[44px] shrink-0 items-center justify-center border-t px-4 py-2 text-center text-sm font-semibold hover:underline"
        >
          View all
        </Link>
      ) : null}
    </div>
  );

  const trigger =
    variant === 'fab' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'border-border/50 bg-background text-foreground shadow-elevated-lg',
          'hover:bg-muted/80 relative hidden min-h-[52px] min-w-[52px] items-center justify-center rounded-full border',
          'fixed right-5 z-40 transition-transform hover:scale-105',
          'bottom-[max(1.25rem,env(safe-area-inset-bottom))]',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'motion-reduce:transform-none motion-reduce:hover:scale-100',
          'lg:flex',
          className
        )}
      >
        <Bell className="h-5 w-5" aria-hidden />
        <NotificationCountBadge count={unreadCount} fab />
      </button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          'relative shrink-0',
          onPrimary &&
            'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden />
        <NotificationCountBadge count={unreadCount} />
      </Button>
    );

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        {isMobile ? (
          <BottomSheetContent
            layout="split"
            overlayClassName={NOTIFICATIONS_PANEL_Z}
            className={NOTIFICATIONS_PANEL_Z}
          >
            {panelBody}
          </BottomSheetContent>
        ) : (
          <SheetContent
            side="right"
            hideClose
            overlayClassName={NOTIFICATIONS_PANEL_Z}
            className={cn(
              NOTIFICATIONS_PANEL_Z,
              'flex h-full w-[min(360px,100vw)] max-w-[360px] flex-col gap-0 border-l p-0 sm:max-w-[360px]'
            )}
          >
            {panelBody}
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}

function NotificationCountBadge({ count, fab = false }: { count: number; fab?: boolean }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'bg-destructive text-destructive-foreground absolute flex items-center justify-center rounded-full font-semibold leading-none',
        fab
          ? 'right-0 top-0 h-5 min-w-5 px-1 text-[10px]'
          : 'right-1 top-1 h-4 min-w-[16px] px-1 text-[10px]'
      )}
      aria-hidden
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
