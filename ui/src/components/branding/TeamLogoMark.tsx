import { cn } from '@/lib/utils';

/** Bundled fallback when settings have not loaded or no custom logo is set. */
const DEFAULT_TEAM_LOGO_URL = '/images/logo.png';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
};

export function TeamLogoMark({ src, alt = 'Organization', className, imageClassName }: Props) {
  const url = src?.trim() || DEFAULT_TEAM_LOGO_URL;

  return (
    <div
      className={cn(
        'bg-card shadow-soft flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl',
        className
      )}
    >
      <img
        src={url}
        alt={alt}
        className={cn('h-full w-full object-cover', imageClassName)}
        width={40}
        height={40}
      />
    </div>
  );
}
