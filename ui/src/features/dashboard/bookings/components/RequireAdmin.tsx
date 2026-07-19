import type { ReactNode } from 'react';

import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import { hostLoginPath } from '@/features/guest/auth/lib/hostAuthPaths';

import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
};

export function RequireAdmin({ children }: Props) {
  const location = useLocation();
  const { status } = useAdminSession();

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

  return <>{children}</>;
}

export function RequireAdminSignOutButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, status } = useAdminSession();

  return (
    <Button
      onClick={async () => {
        try {
          if (status !== 'signed-out') {
            await signOut();
          }
        } finally {
          navigate(hostLoginPath(location.pathname + location.search), { replace: true });
        }
      }}
      variant="outline"
      className="h-9 w-full text-[13px]"
    >
      Sign out
    </Button>
  );
}
