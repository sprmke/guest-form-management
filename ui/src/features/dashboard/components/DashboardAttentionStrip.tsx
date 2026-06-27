import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bell, Info } from 'lucide-react';
import type { DashboardAttentionItem } from '@/features/dashboard/lib/types';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  critical: {
    icon: AlertTriangle,
    chip: 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 dark:border-rose-400/35',
    count: 'text-rose-700 dark:text-rose-300',
    iconWrap: 'text-rose-600 dark:text-rose-400',
  },
  warning: {
    icon: Bell,
    chip: 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 dark:border-amber-400/35',
    count: 'text-amber-800 dark:text-amber-300',
    iconWrap: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: Info,
    chip: 'border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/15 dark:border-sky-400/30',
    count: 'text-sky-800 dark:text-sky-300',
    iconWrap: 'text-sky-600 dark:text-sky-400',
  },
} as const;

type Props = {
  items: DashboardAttentionItem[];
};

export function DashboardAttentionStrip({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="surface-card min-w-0 px-3 py-3 sm:px-4" aria-label="Needs attention">
      <p className="section-eyebrow mb-2.5 px-0.5">Needs attention</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {items.map((item) => {
          const style = SEVERITY_STYLES[item.severity];
          const Icon = style.icon;
          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'group inline-flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 py-2 transition-colors sm:w-auto sm:gap-2.5 sm:px-3.5',
                style.chip,
              )}
            >
              <Icon className={cn('size-4 shrink-0', style.iconWrap)} aria-hidden />
              <span className="text-sm font-semibold text-foreground sm:whitespace-nowrap">
                {item.label}
              </span>
              <span
                className={cn(
                  'inline-flex min-w-[1.75rem] items-center justify-center rounded-lg bg-card/80 px-2 py-0.5 text-sm font-bold tabular-nums shadow-sm',
                  style.count,
                )}
              >
                {item.count}
              </span>
              <ArrowRight
                className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-70 sm:ml-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 motion-reduce:opacity-70"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
