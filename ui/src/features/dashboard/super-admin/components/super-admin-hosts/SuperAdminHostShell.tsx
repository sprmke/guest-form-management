import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { useHost } from '@/features/dashboard/super-admin/hooks/useHosts';
import { hostDisplayInitial } from '@/features/dashboard/super-admin/lib/superAdminHostsFilters';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

import { RouteGuardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';

const HOST_TABS = [
  {
    id: 'orgs',
    label: 'Organizations',
    path: (hostId: string) => superAdminPaths.hostOrgs(hostId),
  },
  {
    id: 'properties',
    label: 'Properties',
    path: (hostId: string) => superAdminPaths.hostProperties(hostId),
  },
] as const;

export function SuperAdminHostShell() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const location = useLocation();
  const { data: host, isLoading, error } = useHost(hostId);

  if (!hostId) {
    return <Navigate to={superAdminPaths.hosts} replace />;
  }

  if (isLoading) {
    return <RouteGuardSkeleton />;
  }

  if (error || !host) {
    return <p className="text-destructive text-sm">Host not found.</p>;
  }

  const initial = hostDisplayInitial(host.name, host.email);
  const propertiesActive = location.pathname.endsWith('/orgs/properties');

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        title={host.name}
        subtitle={host.email || undefined}
        actions={
          host.avatarUrl ? (
            <img
              src={host.avatarUrl}
              alt=""
              className="size-10 rounded-full object-cover"
              width={40}
              height={40}
            />
          ) : (
            <div className="gradient-primary text-primary-foreground flex size-10 items-center justify-center rounded-full text-sm font-bold">
              {initial}
            </div>
          )
        }
      />

      <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-0 gap-2">
          {HOST_TABS.map((tab) => {
            const href = tab.path(hostId);
            const active =
              tab.id === 'properties'
                ? propertiesActive
                : !propertiesActive && location.pathname === href;
            return (
              <Link
                key={tab.id}
                to={href}
                className={cn(
                  'inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Outlet context={{ host }} />
    </div>
  );
}

export type SuperAdminHostOutletContext = {
  host: NonNullable<ReturnType<typeof useHost>['data']>;
};
