import { useState } from 'react';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[12px]',
  lg: 'size-12 text-[15px]',
};

type Props = {
  name: string;
  /** Public/signed URL of the guest's valid ID (preferred). May be null. */
  validIdUrl?: string | null;
  size?: Size;
  className?: string;
};

/**
 * Guest avatar — renders the valid-ID picture when available, falling back
 * to a green initial bubble when the URL is missing OR fails to load.
 *
 * Per UI spec: only one accent color (sidebar primary green) is used for
 * the fallback background. Avoid the multi-color hashed palette we used
 * before so the table reads cleanly.
 */
export function GuestAvatar({
  name,
  validIdUrl,
  size = 'md',
  className,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name?.trim()[0] ?? '?').toUpperCase();
  const showImage = Boolean(validIdUrl) && !imgFailed;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center font-black shrink-0 ring-1 ring-inset ring-black/[0.04]',
        SIZE_CLASS[size],
        className,
      )}
      style={
        showImage
          ? undefined
          : {
              background: 'hsl(var(--sidebar-primary))',
              color: 'hsl(var(--sidebar-primary-foreground))',
            }
      }
      aria-hidden
    >
      {showImage ? (
        <img
          src={validIdUrl ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
