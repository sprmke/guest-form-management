import { CalendarDays, ExternalLink, Link2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  href: string;
  title: string;
  subtitle?: string;
  variant?: 'calendar' | 'generic';
  outbound?: boolean;
  className?: string;
};

/**
 * Compact tap target for https links in chat (Airbnb-style action chip — not a raw URL wrap).
 */
export function ChatUrlLinkCard({
  href,
  title,
  subtitle = 'Open link',
  variant = 'generic',
  outbound = false,
  className,
}: Props) {
  const Icon = variant === 'calendar' ? CalendarDays : Link2;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'my-1.5 flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2.5 no-underline transition-opacity hover:opacity-95',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        outbound
          ? 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground'
          : 'border-border/70 bg-muted/50 text-foreground',
        className
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          outbound ? 'bg-primary-foreground/15' : 'bg-muted'
        )}
      >
        <Icon className="size-4 opacity-80" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-snug">{title}</span>
        <span
          className={cn(
            'block truncate text-[11px] leading-snug',
            outbound ? 'text-primary-foreground/75' : 'text-muted-foreground'
          )}
        >
          {subtitle}
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}
