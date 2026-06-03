import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueClassName?: string;
  size?: 'default' | 'hero';
};

export function FinanceKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  valueClassName,
  size = 'default',
}: Props) {
  const isHero = size === 'hero';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md dark:shadow-none',
        isHero
          ? 'border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5'
          : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-semibold uppercase tracking-wider text-muted-foreground',
              isHero ? 'text-[11px]' : 'text-[10px]',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'mt-1.5 truncate font-bold tabular-nums text-foreground',
              isHero ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl',
              valueClassName,
            )}
          >
            {value}
          </p>
          {hint && (
            <p
              className={cn(
                'mt-1 text-muted-foreground',
                isHero ? 'text-xs' : 'text-[11px]',
              )}
            >
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg',
              isHero
                ? 'size-10 bg-primary/15'
                : 'size-8 bg-muted/80 group-hover:bg-muted',
            )}
          >
            <Icon
              className={cn(
                isHero ? 'size-5' : 'size-4',
                isHero ? 'text-primary' : iconColor,
              )}
              aria-hidden
            />
          </div>
        )}
      </div>
    </div>
  );
}
