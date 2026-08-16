import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
}

export function PasswordInput({ className, error, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={cn(
          'pr-10',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOffIcon className="text-muted-foreground h-4 w-4" />
        ) : (
          <EyeIcon className="text-muted-foreground h-4 w-4" />
        )}
        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
      </Button>
    </div>
  );
}
