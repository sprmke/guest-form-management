import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';

type Props = {
  children: ReactNode;
};

/**
 * Route guard for admin-only pages. See `.cursor/rules/admin-auth.mdc` §3.
 *
 * - `loading`    → centered spinner
 * - `signed-out` → redirect to /sign-in with ?redirect=<current>
 * - `not-admin`  → friendly "Not authorized" card with sign-out CTA
 * - `admin`      → render children
 */
export function RequireAdmin({ children }: Props) {
  const location = useLocation();
  const { status, email, allowedEmails, signOut } = useAdminSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="flex flex-col gap-3 items-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
          <span className="text-sm">Loading your session…</span>
        </div>
      </div>
    );
  }

  if (status === 'signed-out') {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />;
  }

  if (status === 'not-admin') {
    const displayList = allowedEmails.length > 0 ? allowedEmails.join(', ') : '—';
    return (
      <div className="grid place-items-center px-4 py-16 min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="p-8 mx-auto w-full max-w-md text-center rounded-2xl border shadow-medium bg-card border-border/60">
          <div className="grid place-items-center mx-auto mb-5 w-14 h-14 rounded-full bg-destructive/10 text-destructive">
            <ShieldOff className="w-7 h-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{email ?? 'This account'}</span> is not on
            the admin allow list.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Authorized: {displayList}</p>
          <div className="flex flex-col gap-2 mt-6">
            <Button
              onClick={async () => {
                await signOut();
              }}
              variant="outline"
            >
              Sign out and try another account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
