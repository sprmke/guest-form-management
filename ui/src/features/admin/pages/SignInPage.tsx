import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { GoogleSignInButton } from '@/features/admin/components/GoogleSignInButton';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { supabase } from '@/lib/supabaseClient';
import { useAdminSession } from '@/features/admin/hooks/useAdminSession';

function safeRedirect(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

export function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const redirect = safeRedirect(params.get('redirect'));
  const { status } = useAdminSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'admin') navigate(redirect, { replace: true });
  }, [status, redirect, navigate]);

  const handleGoogle = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      if (status === 'not-admin') await supabase.auth.signOut();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ─── Left brand panel ─────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[46%] xl:w-[44%]"
        style={{ backgroundColor: 'hsl(168 65% 40%)' }}
        aria-hidden="true"
      >
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative orbs */}
        <div
          className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
          }}
        />

        {/* Brand mark */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/25 bg-card/10">
            <span className="size-1.5 rounded-full bg-card" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
              Admin
            </span>
          </div>
        </div>

        {/* Main brand */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-[48px] font-extrabold tracking-tight text-white leading-none">
              Kame Home
            </h1>
            <p className="mt-2 text-[15px] font-medium text-white/60 tracking-wide">
              Monaco 2604 · Azure North, Pampanga
            </p>
          </div>

          <div className="w-12 h-px bg-card/30" />

          <blockquote className="text-[15px] text-white/60 leading-relaxed font-light italic max-w-[300px]">
            "Your property, perfectly managed."
          </blockquote>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[11px] text-white/30">
            © 2024 Kame Home. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── Right form panel ──────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="mb-8 animate-fade-in-up text-center lg:hidden">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-soft">
            <span className="text-lg font-black text-primary-foreground">K</span>
          </div>
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            Kame Home
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Monaco 2604 · Admin</p>
        </div>

        <div className="w-full max-w-[360px] animate-fade-in-up animation-delay-200 space-y-7">
          <div>
            <p className="section-eyebrow mb-2">Admin access</p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              Sign in with your authorized Google account to access the admin
              dashboard.
            </p>
          </div>

          {/* Access-restricted notice */}
          {status === 'not-admin' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden />
              <p className="text-[13px] leading-snug">
                We could not open the admin area with your current Google
                account. Please try another account.
              </p>
            </div>
          )}

          {/* OAuth error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden />
              <p className="text-[13px] leading-snug">{error}</p>
            </div>
          )}

          {/* Google button */}
          <GoogleSignInButton
            onClick={handleGoogle}
            loading={isSigningIn}
            disabled={status === 'loading'}
          />

          {/* Footer note */}
          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            Only authorized property administrators can sign in. Public guests
            should use the{' '}
            <a
              href="/form"
              className="text-sidebar-primary underline underline-offset-2 hover:text-sidebar-accent-foreground"
            >
              booking form
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
