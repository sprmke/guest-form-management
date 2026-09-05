import { ScrollText } from 'lucide-react';

import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { useSuperAdminOrgContext } from '@/features/dashboard/super-admin/components/super-admin-orgs/superAdminOrgContext';
import { useSuperAdminAudit } from '@/features/dashboard/super-admin/hooks/useSuperAdminAudit';

import { Card } from '@/components/ui/card';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SuperAdminOrgActivitySection() {
  const { org } = useSuperAdminOrgContext();
  const { data, isLoading, error } = useSuperAdminAudit({
    page: 1,
    limit: 50,
    targetType: 'organization',
    targetId: org.id,
  });
  const events = data?.events ?? [];

  if (isLoading) return <SuperAdminPageLoading />;
  if (error) return <p className="text-destructive text-sm">Could not load activity.</p>;

  return events.length === 0 ? (
    <SuperAdminEmptyState icon={ScrollText} title="No recorded super-admin actions for this org" />
  ) : (
    <ol className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <Card padding="sm" className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{event.summary}</p>
              <span className="text-muted-foreground shrink-0 text-xs">
                {relativeTime(event.createdAt)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              <span className="font-mono">{event.action}</span> · {event.actorEmail}
            </p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
