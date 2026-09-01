import { useEffect, useMemo, useState } from 'react';

import { ArrowUpRight, Megaphone } from 'lucide-react';

import type { HostAnnouncement } from '@/features/dashboard/announcements/lib/hostAnnouncementTypes';
import type { HostAnnouncementSeverity } from '@/features/dashboard/announcements/lib/hostAnnouncementTypes';
import {
  groupHostAnnouncementsForFeed,
  HOST_ANNOUNCEMENT_FEED_PAGE_SIZE,
  hostAnnouncementIdentityKey,
  type HostAnnouncementFeedGroup,
} from '@/features/dashboard/announcements/lib/hostAnnouncementPresentation';
import { AdminSectionGroupHeading } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { PublicListingPagination } from '@/features/guest/marketing/shared/components/PublicListingPagination';

import { cn } from '@/lib/utils';

const SEVERITY_ROW_CLASS: Record<HostAnnouncementSeverity, string> = {
  critical: 'border-l-rose-500/90',
  warning: 'border-l-amber-500/80',
  info: 'border-l-border/70',
};

type HostAnnouncementCardProps = {
  announcement: HostAnnouncement;
  /** Last row in a group panel — skip bottom divider spacing cue. */
  isLast?: boolean;
};

export function HostAnnouncementCard({ announcement, isLast }: HostAnnouncementCardProps) {
  const linkLabel = announcement.linkLabel?.trim() || 'Learn more';
  const hasLink = Boolean(announcement.linkUrl);

  return (
    <article
      className={cn(
        'group relative border-l-[3px] py-4 pl-4 pr-4 sm:py-[1.125rem] sm:pl-5 sm:pr-5',
        SEVERITY_ROW_CLASS[announcement.severity],
        !isLast && 'border-border/40 border-b'
      )}
      role="status"
      aria-label={announcement.title}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-foreground text-[15px] font-semibold leading-snug tracking-tight sm:text-base">
            {announcement.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{announcement.body}</p>
        </div>

        {hasLink ? (
          <a
            href={announcement.linkUrl!}
            target="_blank"
            rel="noreferrer"
            className="text-foreground/80 hover:text-foreground inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-medium transition-colors sm:pt-0.5"
          >
            {linkLabel}
            <ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function HostAnnouncementGroupSection({ group }: { group: HostAnnouncementFeedGroup }) {
  const [page, setPage] = useState(1);
  const count = group.announcements.length;
  const pageCount = Math.max(1, Math.ceil(count / HOST_ANNOUNCEMENT_FEED_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const pageAnnouncements = useMemo(() => {
    const start = (safePage - 1) * HOST_ANNOUNCEMENT_FEED_PAGE_SIZE;
    return group.announcements.slice(start, start + HOST_ANNOUNCEMENT_FEED_PAGE_SIZE);
  }, [group.announcements, safePage]);

  if (count === 0) return null;

  return (
    <section aria-label={group.label}>
      <AdminSectionGroupHeading
        className="mb-3 px-0.5"
        title={group.label}
        action={
          <PublicListingPagination
            variant="inline"
            compact
            showPageIndicator={false}
            page={safePage}
            totalPages={pageCount}
            onPageChange={setPage}
          />
        }
      />

      <div className="surface-card overflow-hidden">
        {pageAnnouncements.map((announcement, index) => (
          <HostAnnouncementCard
            key={hostAnnouncementIdentityKey(announcement)}
            announcement={announcement}
            isLast={index === pageAnnouncements.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

export function HostAnnouncementFeed({ announcements }: { announcements: HostAnnouncement[] }) {
  if (announcements.length === 0) {
    return (
      <div className="surface-card text-muted-foreground flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <Megaphone className="text-muted-foreground/50 size-8 stroke-[1.25]" aria-hidden />
        <p className="text-sm">No active announcements.</p>
      </div>
    );
  }

  const groups = groupHostAnnouncementsForFeed(announcements);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <HostAnnouncementGroupSection key={group.key} group={group} />
      ))}
    </div>
  );
}
