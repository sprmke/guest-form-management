import { useState } from 'react';

import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { AlertCircle, ArrowRight } from 'lucide-react';

import type { AuthPageConfig } from '@/features/guest/auth/config/auth-page-config';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SpinnerIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AuthDivider } from './AuthDivider';
import { FormField } from './FormField';
import { PasswordInput } from './PasswordInput';
import { SocialAuthButtons } from './SocialAuthButtons';

interface HostGoogleAuthHandlers {
  error: string | null;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
}

interface LoginPageContentProps {
  config: AuthPageConfig;
  hostGoogleAuth?: HostGoogleAuthHandlers;
}

export function LoginPageContent({ config, hostGoogleAuth }: LoginPageContentProps) {
  const navigate = useNavigate();
  const c = config.login;
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    // TODO: Replace with actual auth logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate(c.successRedirect);
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isHost = config.audience === 'host';

  return (
    <div className="animate-in fade-in-50 duration-500">
      <div className="mb-8">
        <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <span>{c.badge}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
        <p className="text-muted-foreground mt-2">{c.subtitle}</p>
      </div>

      {hostGoogleAuth?.error ? (
        <div className="border-destructive/20 bg-destructive/5 text-destructive mb-4 flex items-start gap-2.5 rounded-xl border p-3.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-[13px] leading-snug">{hostGoogleAuth.error}</p>
        </div>
      ) : null}

      <SocialAuthButtons
        mode="login"
        disabled={isLoading}
        audience={config.audience}
        onGoogleSignIn={hostGoogleAuth?.signInWithGoogle}
        googleLoading={hostGoogleAuth?.isSigningIn}
        successRedirect={c.successRedirect}
      />

      {!isHost ? (
        <>
          <AuthDivider text="or continue with email" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email address" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.email}
              />
            </FormField>

            <FormField label="Password" htmlFor="password" error={errors.password}>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.password}
              />
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, rememberMe: checked as boolean }))
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="text-muted-foreground cursor-pointer text-sm font-normal"
                >
                  Remember me
                </Label>
              </div>
              <Link
                to={c.forgotPasswordHref}
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="shadow-primary/20 h-11 w-full font-medium shadow-lg"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </>
      ) : null}

      {!isHost ? (
        <>
          <p className="text-muted-foreground mt-8 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link
              to={c.registerHref}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Create one now
            </Link>
          </p>

          <div className="border-border mt-4 border-t pt-4">
            <p className="text-muted-foreground text-center text-xs">
              Are you a property host?{' '}
              <Link
                to={c.otherRoleHref}
                className="text-foreground hover:text-primary font-semibold transition-colors"
              >
                {c.otherRoleLabel}
              </Link>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
