import { BadgeCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

export function ListingVerifiedBadge({ className, size = 'sm' }: Props) {
  return (
    <span
      className={cn(
        'bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1 rounded-full font-semibold',
        size === 'sm' && 'px-2 py-0.5 text-[11px]',
        size === 'md' && 'gap-1.5 px-2.5 py-1 text-xs',
        className
      )}
    >
      <BadgeCheck className={cn(size === 'sm' ? 'size-3' : 'size-3.5')} aria-hidden />
      Verified
    </span>
  );
}
