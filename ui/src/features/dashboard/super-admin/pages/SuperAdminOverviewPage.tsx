import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SUPER_ADMIN_PLATFORM_DESTINATIONS } from '@/features/dashboard/super-admin/lib/superAdminPlatformNav';

export function SuperAdminOverviewPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader title="Overview" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPER_ADMIN_PLATFORM_DESTINATIONS.map(({ label, href, Icon }) => (
          <Link
            key={href}
            to={href}
            className="border-border bg-card hover:border-primary/40 flex min-h-[88px] items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
