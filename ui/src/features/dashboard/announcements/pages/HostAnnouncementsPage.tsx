import { useMemo } from 'react';

import { useParams } from 'react-router-dom';

import { HostAnnouncementFeed } from '@/features/dashboard/announcements/components/HostAnnouncementCard';
import { HostAnnouncementStatCards } from '@/features/dashboard/announcements/components/HostAnnouncementStatCards';
import { useHostAnnouncements } from '@/features/dashboard/announcements/hooks/useHostAnnouncements';
import { summarizeHostAnnouncements } from '@/features/dashboard/announcements/lib/hostAnnouncementPresentation';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import {
  orgPageTitle,
  parkingDashboardPageTitle,
  propertyDashboardPageTitle,
  usePageTitle,
} from '@/lib/pageTitle';

const PAGE_SUBTITLE = 'Platform maintenance, product updates, and development notices.';

export function HostAnnouncementsPage() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  const orgsQuery = useOrganizations();
  const { announcements, isLoading, isError, refetch } = useHostAnnouncements();

  const summary = useMemo(() => summarizeHostAnnouncements(announcements), [announcements]);

  const orgFromList = orgsQuery.data?.organizations.find((org) => org.slug === orgSlug);
  const pageTitle = orgContext
    ? propertyDashboardPageTitle(orgContext.property.name, 'Announcements')
    : parkingContext
      ? parkingDashboardPageTitle(
          parkingContext.org.name,
          parkingContext.parking.name,
          'Announcements'
        )
      : orgFromList
        ? orgPageTitle(orgFromList.name, 'Announcements')
        : undefined;

  usePageTitle(pageTitle);

  return (
    <AdminMobilePage
      title="Announcements"
      subtitle={PAGE_SUBTITLE}
      titleId="host-announcements-heading"
    >
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-destructive text-sm">Could not load announcements.</p>
          <button
            type="button"
            className="text-primary text-sm font-medium underline-offset-2 hover:underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          <HostAnnouncementStatCards summary={summary} />
          <HostAnnouncementFeed announcements={announcements} />
        </div>
      )}
    </AdminMobilePage>
  );
}
