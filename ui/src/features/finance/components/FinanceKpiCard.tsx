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
  iconColor = 'text-slate-400',
  valueClassName,
  size = 'default',
}: Props) {
  const isHero = size === 'hero';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md',
        isHero
          ? 'border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-5'
          : 'border-slate-200/80 p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-semibold uppercase tracking-wider text-slate-500',
              isHero ? 'text-[11px]' : 'text-[10px]',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'mt-1.5 truncate font-bold tabular-nums',
              isHero ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl',
              valueClassName ?? (isHero ? 'text-teal-800' : 'text-slate-900'),
            )}
          >
            {value}
          </p>
          {hint && (
            <p
              className={cn(
                'mt-1 text-slate-500',
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
                ? 'size-10 bg-teal-100/80'
                : 'size-8 bg-slate-100 group-hover:bg-slate-200/60',
            )}
          >
            <Icon
              className={cn(
                isHero ? 'size-5' : 'size-4',
                isHero ? 'text-teal-700' : iconColor,
              )}
              aria-hidden
            />
          </div>
        )}
      </div>
    </div>
  );
}
