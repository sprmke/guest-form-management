import { useState, Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/ui/icons';
import type { AuthPageConfig } from '@/features/guest/auth/config/auth-page-config';

interface VerifyEmailPageContentProps {
  config: AuthPageConfig;
}

function VerifyEmailContentInner({ config }: VerifyEmailPageContentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const c = config.verifyEmail;

  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (token) {
      setIsVerifying(true);
      // TODO: Replace with actual verification logic
      new Promise((resolve) => setTimeout(resolve, 2000)).then(() => {
        setIsVerified(true);
        setIsVerifying(false);
      });
    }
  }, [token]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    setIsResending(true);
    // TODO: Replace with actual resend logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsResending(false);
    setCountdown(60);
  };

  if (isVerifying) {
    return (
      <div className="animate-in fade-in-50 py-12 text-center duration-500">
        <SpinnerIcon className="text-primary mx-auto mb-4 h-8 w-8" />
        <h1 className="text-xl font-semibold">Verifying your email...</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Please wait while we verify your email address.
        </p>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="animate-in fade-in-50 text-center duration-500">
        <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <CheckCircle2 className="text-primary h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Email verified!</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Your email has been successfully verified. You can now access all features of your
          account.
        </p>
        <div className="border-primary/20 bg-primary/5 mt-8 rounded-xl border p-4">
          <p className="text-primary text-sm">
            🎉 Welcome to Kame Homes! Your account is now fully activated.
          </p>
        </div>
        <Button
          className="shadow-primary/20 mt-8 h-11 w-full font-medium shadow-lg"
          onClick={() => navigate(c.successRedirect)}
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-50 text-center duration-500">
      <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <Mail className="text-primary h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        We&apos;ve sent a verification link to
        {email && (
          <>
            <br />
            <span className="text-foreground font-medium">{email}</span>
          </>
        )}
      </p>

      <div className="border-border bg-muted mt-8 rounded-xl border p-6 text-left">
        <h3 className="mb-3 text-sm font-medium">What to do next:</h3>
        <ol className="text-muted-foreground space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              1
            </span>
            <span>Check your email inbox (and spam folder)</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              2
            </span>
            <span>Click the verification link in the email</span>
          </li>
          <li className="flex gap-3">
            <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              3
            </span>
            <span>Start managing your properties!</span>
          </li>
        </ol>
      </div>

      <div className="mt-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={isResending || countdown > 0}
        >
          {isResending ? (
            <>
              <SpinnerIcon className="mr-2" />
              Sending...
            </>
          ) : countdown > 0 ? (
            `Resend in ${countdown}s`
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend verification email
            </>
          )}
        </Button>
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        Wrong email?{' '}
        <Link
          to={c.registerHref}
          className="text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Register with a different email
        </Link>
      </p>

      <Link
        to={c.loginHref}
        className="text-primary hover:text-primary/80 mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}

export function VerifyEmailPageContent({ config }: VerifyEmailPageContentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      }
    >
      <VerifyEmailContentInner config={config} />
    </Suspense>
  );
}
