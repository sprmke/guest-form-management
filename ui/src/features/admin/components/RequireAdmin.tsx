import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/features/admin/hooks/useAdminSession";

type Props = {
  children: ReactNode;
};

/**
 * Route guard for admin-only pages. See `.cursor/rules/admin-auth.mdc` §3.
 *
 * - `loading`    → full-page spinner
 * - `signed-out` → redirect to /sign-in with ?redirect=<current>
 * - `not-admin`  → generic "access restricted" screen (no allow-list disclosure)
 * - `admin`      → render children
 */
export function RequireAdmin({ children }: Props) {
  const location = useLocation();
  const { status, signOut } = useAdminSession();

  if (status === "loading") {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white"
        role="status"
        aria-label="Loading session"
      >
        {/* Subtle brand mark while loading */}
        <div className="mb-2 text-center">
          <p className="text-[13px] font-bold tracking-tight text-slate-700">
            Kame Home
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Monaco 2604</p>
        </div>
        <Loader2
          className="size-5 animate-spin text-sidebar-primary"
          aria-hidden
        />
        <p className="text-[13px] text-slate-400">Verifying your session…</p>
      </div>
    );
  }

  if (status === "signed-out") {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />;
  }

  if (status === "not-admin") {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 bg-sidebar-accent/20">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-[0_4px_24px_0_rgb(0,0,0,0.06)] p-8 text-center">
          <div className="mx-auto mb-5 size-12 rounded-xl bg-red-50 flex items-center justify-center">
            <ShieldOff className="size-6 text-red-500" aria-hidden />
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
            Access restricted
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            Your Google account does not have permission to view this page.
          </p>
          <div className="mt-6">
            <Button
              onClick={async () => {
                await signOut();
              }}
              variant="outline"
              className="w-full text-[13px] h-9"
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
