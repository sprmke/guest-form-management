import { useMemo } from 'react';

import { HostAnnouncementBannerStrip } from '@/features/dashboard/announcements/components/HostAnnouncementBannerStrip';
import { useHostAnnouncementBannerDismiss } from '@/features/dashboard/announcements/hooks/useHostAnnouncementBannerDismiss';
import { useHostAnnouncements } from '@/features/dashboard/announcements/hooks/useHostAnnouncements';
import {
  hostAnnouncementIdentityKey,
  sortHostAnnouncementsByPriority,
} from '@/features/dashboard/announcements/lib/hostAnnouncementPresentation';
import {
  useHasHostAnnouncementsArchiveScope,
  useHostAnnouncementsBasePath,
} from '@/features/dashboard/announcements/lib/hostAnnouncementsPaths';
import { useNotificationsOrgScope } from '@/features/dashboard/notifications/lib/notificationsScope';

import { useIsBelowLg } from '@/hooks/useMediaQuery';

export function AdminAnnouncementBanner() {
  const isBelowLg = useIsBelowLg();
  const hasArchive = useHasHostAnnouncementsArchiveScope();
  const { orgId } = useNotificationsOrgScope();
  const { announcements, isLoading, isError, refetch } = useHostAnnouncements();
  const announcementsPath = useHostAnnouncementsBasePath();

  const sortedAnnouncements = useMemo(
    () => sortHostAnnouncementsByPriority(announcements),
    [announcements]
  );

  const activeIdentityKeys = useMemo(
    () => sortedAnnouncements.map((entry) => hostAnnouncementIdentityKey(entry)),
    [sortedAnnouncements]
  );

  const { dismissedKeys, dismiss } = useHostAnnouncementBannerDismiss(orgId, activeIdentityKeys);

  const undismissedAnnouncements = useMemo(
    () =>
      sortedAnnouncements.filter((entry) => !dismissedKeys.has(hostAnnouncementIdentityKey(entry))),
    [sortedAnnouncements, dismissedKeys]
  );

  const bannerAnnouncement = undismissedAnnouncements[0] ?? null;

  /* Desktop-only strip — do not mount a hidden sibling on mobile (breaks space-y layout). */
  if (isBelowLg) return null;

  if (!hasArchive) return null;

  if (isError) {
    return (
      <div className="surface-card mb-2 border-l-[3px] border-l-rose-500 px-4 py-3 sm:mb-2.5">
        <p className="text-destructive text-sm">Could not load announcements.</p>
        <button
          type="button"
          className="text-destructive mt-1 text-sm font-medium underline-offset-2 hover:underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !bannerAnnouncement || !announcementsPath) return null;

  const dismissCurrent = () => dismiss(hostAnnouncementIdentityKey(bannerAnnouncement));

  return (
    <div className="mb-2 sm:mb-2.5" aria-label="Announcements">
      <HostAnnouncementBannerStrip
        announcement={bannerAnnouncement}
        totalCount={sortedAnnouncements.length}
        announcementsPath={announcementsPath}
        onDismiss={dismissCurrent}
      />
    </div>
  );
}
