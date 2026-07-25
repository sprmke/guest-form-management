import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SpinnerIcon } from '@/components/ui/icons';
import { FormField } from './FormField';
import type { AuthPageConfig } from '@/features/guest/auth/config/auth-page-config';

interface ForgotPasswordPageContentProps {
  config: AuthPageConfig;
}

export function ForgotPasswordPageContent({ config }: ForgotPasswordPageContentProps) {
  const c = config.forgotPassword;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    // TODO: Replace with actual password reset logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="animate-in fade-in-50 text-center duration-500">
        <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Mail className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          We&apos;ve sent a password reset link to{' '}
          <span className="text-foreground font-medium">{email}</span>
        </p>
        <div className="bg-muted mt-8 rounded-xl p-4 text-left">
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">Didn&apos;t receive the email?</strong>
            <br />
            Check your spam folder or{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              try a different email address
            </button>
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={async () => {
            setIsLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setIsLoading(false);
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="mr-2" />
              Resending...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend email
            </>
          )}
        </Button>
        <Link
          to={c.backToLoginHref}
          className="text-primary hover:text-primary/80 mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-50 duration-500">
      <Link
        to={c.backToLoginHref}
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          No worries! Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email address" htmlFor="email" error={error}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            disabled={isLoading}
            error={!!error}
          />
        </FormField>

        <Button
          type="submit"
          className="shadow-primary/20 h-11 w-full font-medium shadow-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="mr-2" />
              Sending reset link...
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Remember your password?{' '}
        <Link
          to={c.loginHref}
          className="text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
