import { Link } from 'react-router-dom';

import { ArrowUpRight, ChevronRight, X } from 'lucide-react';

import {
  HOST_ANNOUNCEMENT_SEVERITY_PRESENTATION,
  hostAnnouncementScopeLabel,
} from '@/features/dashboard/announcements/lib/hostAnnouncementPresentation';
import type { HostAnnouncement } from '@/features/dashboard/announcements/lib/hostAnnouncementTypes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HostAnnouncementBannerStripProps = {
  announcement: HostAnnouncement;
  totalCount: number;
  announcementsPath?: string | null;
  onDismiss?: () => void;
};

export function HostAnnouncementBannerStrip({
  announcement,
  totalCount,
  announcementsPath,
  onDismiss,
}: HostAnnouncementBannerStripProps) {
  const presentation = HOST_ANNOUNCEMENT_SEVERITY_PRESENTATION[announcement.severity];
  const Icon = presentation.icon;
  const scopeLabel = hostAnnouncementScopeLabel(announcement);
  const overflowCount = Math.max(0, totalCount - 1);
  const showBody = announcement.severity === 'critical';

  return (
    <div
      className="surface-card overflow-hidden"
      role="status"
      aria-label={`Announcement: ${announcement.title}`}
    >
      <div
        className={cn(
          'flex min-h-9 items-center gap-2 px-2 py-1.5 sm:min-h-10 sm:gap-2.5 sm:px-2.5 sm:py-2',
          'border-l-[3px]',
          presentation.accentBorder
        )}
      >
        <div
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md sm:size-7',
            presentation.iconWrap
          )}
        >
          <Icon className={cn('size-3 sm:size-3.5', presentation.iconColor)} aria-hidden />
        </div>

        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs leading-tight sm:text-[13px]">
          <span className="text-foreground font-semibold">{announcement.title}</span>
          <span aria-hidden> · </span>
          <span>{scopeLabel}</span>
          {showBody ? (
            <>
              <span aria-hidden> — </span>
              <span>{announcement.body}</span>
            </>
          ) : null}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          {announcement.linkUrl ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-primary h-9 gap-0.5 px-2 text-[11px] font-medium sm:text-xs"
            >
              <a href={announcement.linkUrl} target="_blank" rel="noreferrer">
                {announcement.linkLabel?.trim() || 'Learn more'}
                <ArrowUpRight className="size-3 opacity-80" aria-hidden />
              </a>
            </Button>
          ) : null}

          {announcementsPath ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-foreground h-9 gap-0.5 px-2 text-[11px] font-medium sm:text-xs"
            >
              <Link to={announcementsPath}>
                {overflowCount > 0 ? `All (${totalCount})` : 'All'}
                <ChevronRight className="size-3 opacity-60" aria-hidden />
              </Link>
            </Button>
          ) : null}

          {onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-9 shrink-0"
              aria-label="Dismiss announcement"
              onClick={onDismiss}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
