import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OtpCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  onEnter,
  disabled,
  error,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
    // Only run once on mount — refocusing on every value change would fight the user's cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDigitsFrom = (index: number, chars: string[]) => {
    const next = digits.slice();
    chars.forEach((c, i) => {
      if (index + i < length) next[index + i] = c;
    });
    const nextValue = next.join('');
    onChange(nextValue);

    const lastFilledIndex = Math.min(index + chars.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();

    if (nextValue.length === length && !next.includes('')) {
      onComplete?.(nextValue);
    }
  };

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }
    applyDigitsFrom(index, raw.split(''));
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  const handlePaste = (index: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    applyDigitsFrom(index, pasted.split(''));
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste(index)}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            'bg-background h-14 w-12 rounded-xl border text-center text-xl font-semibold shadow-sm outline-none transition-colors sm:h-16 sm:w-14',
            'focus:border-primary focus:ring-primary/20 focus:ring-2',
            error ? 'border-destructive' : 'border-input',
            disabled && 'opacity-60'
          )}
        />
      ))}
    </div>
  );
}
