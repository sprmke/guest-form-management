import { useState, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/ui/icons';
import { PasswordInput } from './PasswordInput';
import { FormField } from './FormField';
import { cn } from '@/lib/utils';
import type { AuthPageConfig } from '@/features/guest/auth/config/auth-page-config';

interface ResetPasswordPageContentProps {
  config: AuthPageConfig;
}

function ResetPasswordFormInner({ config }: ResetPasswordPageContentProps) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const c = config.resetPassword;

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (!token) {
    return (
      <div className="animate-in fade-in-50 text-center duration-500">
        <div className="bg-destructive/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Lock className="text-destructive h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Invalid or expired link</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className="mt-8 space-y-3">
          <Button asChild className="shadow-primary/20 h-11 w-full font-medium shadow-lg">
            <Link to={c.forgotPasswordHref}>
              Request new link
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Link
            to={c.backToLoginHref}
            className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="animate-in fade-in-50 text-center duration-500">
        <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <ShieldCheck className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Password reset successful</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Button asChild className="shadow-primary/20 mt-8 h-11 w-full font-medium shadow-lg">
          <Link to={c.successLoginHref}>
            Sign in to your account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
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
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Enter your new password below. Make sure it&apos;s strong and unique.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="New password" htmlFor="password" error={errors.password}>
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
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm your new password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            disabled={isLoading}
            error={!!errors.confirmPassword}
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
              Resetting password...
            </>
          ) : (
            <>
              Reset password
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export function ResetPasswordPageContent({ config }: ResetPasswordPageContentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      }
    >
      <ResetPasswordFormInner config={config} />
    </Suspense>
  );
}
