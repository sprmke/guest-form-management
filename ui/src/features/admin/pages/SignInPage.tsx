import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';

function safeRedirect(raw: string | null): string {
  if (!raw) return '/bookings';
  // Only allow relative paths so we never bounce to an external host.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/bookings';
  return raw;
}

export function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const redirect = safeRedirect(params.get('redirect'));
  const { status, email, allowedEmails, signOut } = useAdminSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the user becomes an admin (either via page load with existing session or
  // after OAuth round-trip), push them to the intended destination.
  useEffect(() => {
    if (status === 'admin') {
      navigate(redirect, { replace: true });
    }
  }, [status, redirect, navigate]);

  const handleGoogle = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/sign-in?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) {
        setError(error.message);
        setIsSigningIn(false);
      }
      // On success the browser navigates away to Google; don't reset state.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setIsSigningIn(false);
    }
  };

  return (
    <main className="grid place-items-center px-4 py-16 min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="p-8 w-full max-w-md rounded-2xl border shadow-hard bg-card border-border/60">
        <div className="grid place-items-center mx-auto w-14 h-14 rounded-2xl shadow-soft bg-primary/10 text-primary">
          <ShieldCheck className="w-7 h-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-center text-foreground">
          Admin sign in
        </h1>
        <p className="mt-1 text-sm text-center text-muted-foreground">
          Kame Home · Monaco 2604
        </p>

        {status === 'not-admin' ? (
          <div className="p-3 mt-6 text-xs rounded-lg border bg-destructive/5 border-destructive/20 text-destructive">
            <strong className="font-semibold">{email}</strong> is not on the admin allow list.
            <div className="mt-1 text-[11px] text-destructive/80">
              Authorized: {allowedEmails.join(', ') || '—'}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-xs text-center text-destructive">{error}</p>
        ) : null}

        <div className="flex flex-col gap-2 mt-6">
          <Button
            size="lg"
            onClick={handleGoogle}
            disabled={isSigningIn || status === 'loading'}
            className="w-full"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" aria-hidden />
                Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleG className="mr-2 w-4 h-4" aria-hidden />
                Continue with Google
              </>
            )}
          </Button>

          {status === 'not-admin' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
              }}
            >
              Use a different Google account
            </Button>
          ) : null}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-center text-muted-foreground">
          Only the configured owner email can access the bookings dashboard. Public guests should
          continue using the booking form at <code className="font-mono">/form</code>.
        </p>
      </div>
    </main>
  );
}

function GoogleG({ className }: { className?: string }) {
  // Monochromatic glyph so the button stays on-brand. The official multicolor "G"
  // is a trademark used with permission in client apps; keep a neutral mark here
  // to avoid embedding brand assets, matching the rest of this codebase's icon style.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        d="M21.35 11.1H12v2.98h5.34c-.23 1.52-1.72 4.46-5.34 4.46-3.22 0-5.84-2.67-5.84-5.96s2.62-5.96 5.84-5.96c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 4.18 14.57 3.2 12 3.2 6.95 3.2 2.86 7.28 2.86 12.33 2.86 17.38 6.95 21.46 12 21.46c6.93 0 9.51-4.86 9.51-9.36 0-.63-.06-1.11-.16-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
