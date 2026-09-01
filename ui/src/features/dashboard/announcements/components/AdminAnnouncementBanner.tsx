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

export function AdminAnnouncementBanner() {
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

  const bannerAnnouncement = useMemo(
    () =>
      sortedAnnouncements.find((entry) => !dismissedKeys.has(hostAnnouncementIdentityKey(entry))) ??
      null,
    [sortedAnnouncements, dismissedKeys]
  );

  if (!hasArchive) return null;

  if (isError) {
    return (
      <div className="surface-card border-l-[3px] border-l-rose-500 px-4 py-3">
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

  if (isLoading || !bannerAnnouncement) return null;

  return (
    <div className="mb-2 sm:mb-2.5" aria-label="Announcements">
      <HostAnnouncementBannerStrip
        announcement={bannerAnnouncement}
        totalCount={sortedAnnouncements.length}
        announcementsPath={announcementsPath}
        onDismiss={() => dismiss(hostAnnouncementIdentityKey(bannerAnnouncement))}
      />
    </div>
  );
}
