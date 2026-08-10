import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

interface MarketingPublicCalloutProps {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  actions?: ReactNode;
  variant?: 'inset' | 'band';
  className?: string;
}

export function MarketingPublicCallout({
  icon: Icon,
  title,
  body,
  actions,
  variant = 'inset',
  className,
}: MarketingPublicCalloutProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between',
        variant === 'inset' && 'border-border bg-muted/40 rounded-2xl border p-6 sm:p-8',
        variant === 'band' && 'container mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="flex gap-4">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-foreground text-lg font-semibold sm:text-xl">{title}</h2>
          <div className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</div>
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>
      ) : null}
    </div>
  );

  if (variant === 'band') {
    return (
      <section className="bg-muted/40 border-border border-y py-14 sm:py-16">{content}</section>
    );
  }

  return content;
}
