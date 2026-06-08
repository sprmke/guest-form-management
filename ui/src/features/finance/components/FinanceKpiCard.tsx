import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueClassName?: string;
  size?: 'default' | 'hero';
};

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  valueClassName,
  size = 'default',
}: Props) {
  const isHero = size === 'hero';

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-card',
        isHero
          ? 'gradient-primary-subtle border-primary/20 p-4 sm:p-5'
          : 'p-3.5 sm:p-4',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-overline">{label}</p>
          <p
            className={cn(
              'mt-1.5 truncate font-bold tabular-nums tracking-tight text-foreground',
              isHero ? 'text-2xl sm:text-[1.75rem]' : 'text-data-primary text-lg sm:text-xl',
              valueClassName,
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              'icon-well-sm',
              isHero ? 'bg-primary/15' : 'bg-muted/70',
            )}
          >
            <Icon
              className={cn(
                'size-[18px]',
                isHero ? 'text-primary' : iconColor,
              )}
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
