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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const NOTIFICATIONS_PANEL_Z = 'z-[110]';

type Props = {
  /** Render against a brand-colored surface (mobile hero band) instead of the default chrome. */
  onPrimary?: boolean;
};

export function NotificationBell({ onPrimary = false }: Props = {}) {
  const [open, setOpen] = useState(false);
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

  const { data, isLoading } = useNotificationsList('preview');
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const hasMoreOnServer = Boolean(data?.pages[0]?.nextCursor);
  const viewAllPath = hubPath ? `${hubPath}${notificationsHubActivityHash()}` : null;

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
              className="text-primary px-1 text-xs font-semibold hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
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
          className="text-primary border-border/50 hover:bg-muted/50 block shrink-0 border-t px-4 py-2 text-center text-sm font-semibold hover:underline"
        >
          View all
        </Link>
      ) : null}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'relative shrink-0',
            onPrimary &&
              'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
          )}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="bg-destructive text-destructive-foreground absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
              aria-hidden
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

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
  );
}
