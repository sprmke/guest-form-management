import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Branded-adjacent "Continue with Google" control: light surface, neutral border,
 * and the standard four-color G mark (same pattern used across the web for OAuth).
 * Matches Google’s light-button guidance more closely than the app’s green primary.
 */
export function GoogleSignInButton({ onClick, disabled, loading }: Props) {
  const busy = Boolean(disabled || loading);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'relative flex h-12 w-full items-center justify-center gap-3 rounded-lg border px-4',
        'border-[#dadce0] bg-white text-[15px] font-medium text-[#3c4043] shadow-sm',
        'transition-[box-shadow,background-color,border-color,transform] duration-200',
        'hover:border-[#d2d2d2] hover:bg-[#f8f9fa] hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'motion-safe:active:scale-[0.99] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-55',
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-[18px] shrink-0 animate-spin text-[#5f6368]" aria-hidden />
          <span>Redirecting to Google…</span>
        </>
      ) : (
        <>
          <GoogleMark className="size-[18px] shrink-0" />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.558 14.225 17.64 11.945 17.64 9.2z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.711c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.959H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.041l3.007-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.959L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
