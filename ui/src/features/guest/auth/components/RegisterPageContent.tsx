import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SpinnerIcon } from '@/components/ui/icons';
import { SocialAuthButtons } from './SocialAuthButtons';
import { AuthDivider } from './AuthDivider';
import { PasswordInput } from './PasswordInput';
import { FormField } from './FormField';
import { cn } from '@/lib/utils';
import type { AuthPageConfig } from '@/features/guest/auth/config/auth-page-config';

interface HostGoogleAuthHandlers {
  error: string | null;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
}

interface RegisterPageContentProps {
  config: AuthPageConfig;
  hostGoogleAuth?: HostGoogleAuthHandlers;
}

export function RegisterPageContent({ config, hostGoogleAuth }: RegisterPageContentProps) {
  const navigate = useNavigate();
  const c = config.register;
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /\d/.test(formData.password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!allRequirementsMet) {
      newErrors.password = 'Password does not meet requirements';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    // TODO: Replace with actual registration logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const redirect =
      c.verifyEmailRedirect.includes('?') || !formData.email
        ? c.verifyEmailRedirect
        : `${c.verifyEmailRedirect}?email=${encodeURIComponent(formData.email)}`;
    navigate(redirect);
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
        mode="register"
        disabled={isLoading}
        audience={config.audience}
        onGoogleSignIn={hostGoogleAuth?.signInWithGoogle}
        googleLoading={hostGoogleAuth?.isSigningIn}
        successRedirect={config.login.successRedirect}
      />

      {!isHost ? (
        <>
          <AuthDivider text="or continue with email" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full name" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.name}
              />
            </FormField>

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
                placeholder="Create a strong password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.password}
              />
              {formData.password && (
                <div className="mt-3 space-y-2">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-2 text-xs transition-colors',
                        req.met ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full transition-colors',
                          req.met ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                      >
                        {req.met && <Check className="h-2.5 w-2.5" />}
                      </div>
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </FormField>

            <FormField
              label="Confirm password"
              htmlFor="confirmPassword"
              error={errors.confirmPassword}
            >
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.confirmPassword}
              />
            </FormField>

            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({ ...prev, acceptTerms: checked as boolean }));
                    if (errors.acceptTerms) {
                      setErrors((prev) => ({ ...prev, acceptTerms: '' }));
                    }
                  }}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="acceptTerms"
                  className={cn(
                    'cursor-pointer text-sm font-normal leading-snug',
                    errors.acceptTerms ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    className="text-primary hover:text-primary/80 underline underline-offset-4"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy"
                    className="text-primary hover:text-primary/80 underline underline-offset-4"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-destructive text-sm">{errors.acceptTerms}</p>
              )}
            </div>

            <Button
              type="submit"
              className="shadow-primary/20 h-11 w-full font-medium shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="mr-2" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </>
      ) : null}

      {!isHost ? (
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Already have an account?{' '}
          <Link
            to={c.loginHref}
            className="text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}
