import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import { RequireAdminSignOutButton } from '@/features/dashboard/bookings/components/RequireAdmin';
import { hostLoginPath } from '@/features/guest/auth/lib/hostAuthPaths';
import { isSuperAdminEmail } from '@/lib/auth/superAdminAllowList';

import { ShieldX } from 'lucide-react';

type Props = {
  children: ReactNode;
};

export function RequireSuperAdmin({ children }: Props) {
  const location = useLocation();
  const { status, email } = useAdminSession();

  if (status === 'loading') {
    return (
      <div
        className="bg-card fixed inset-0 flex flex-col items-center justify-center gap-4"
        role="status"
        aria-label="Loading session"
      >
        <Loader2 className="text-sidebar-primary size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to={hostLoginPath(location.pathname + location.search)} replace />;
  }

  if (!isSuperAdminEmail(email)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10" role="alert">
        <div className="border-border bg-card w-full max-w-[min(calc(100vw-1.5rem),24rem)] rounded-xl border p-6 text-center">
          <ShieldX className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden />
          <h1 className="text-foreground text-lg font-semibold">Access restricted</h1>
          <div className="mt-6">
            <RequireAdminSignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
