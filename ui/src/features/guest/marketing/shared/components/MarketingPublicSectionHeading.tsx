import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface MarketingPublicSectionHeadingProps {
  title: string;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  titleClassName?: string;
}

export function MarketingPublicSectionHeading({
  title,
  description,
  align = 'left',
  className,
  titleClassName,
}: MarketingPublicSectionHeadingProps) {
  return (
    <header className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      <h2
        className={cn(
          'text-foreground text-xl font-bold tracking-tight sm:text-2xl md:text-3xl',
          titleClassName
        )}
      >
        {title}
      </h2>
      {description ? (
        <div
          className={cn(
            'text-muted-foreground mt-3 text-base leading-relaxed',
            align === 'center' && 'mx-auto max-w-xl'
          )}
        >
          {description}
        </div>
      ) : null}
    </header>
  );
}
