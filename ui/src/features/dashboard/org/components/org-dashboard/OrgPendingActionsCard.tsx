import { Link } from 'react-router-dom';

import { AlertTriangle, Bell, ChevronRight, Info } from 'lucide-react';

import type { DashboardAttentionItem } from '@/features/dashboard/property/lib/types';
import { orgBookingsPath } from '@/features/dashboard/org/lib/tenantPaths';

import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  critical: {
    icon: AlertTriangle,
    card: 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10',
    iconWrap: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  warning: {
    icon: Bell,
    card: 'border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10',
    iconWrap: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: Info,
    card: 'border-border hover:bg-muted/40',
    iconWrap: 'bg-muted text-muted-foreground',
  },
} as const;

type Props = {
  orgSlug: string;
  defaultPropertySlug: string | null;
  items: DashboardAttentionItem[];
};

function orgAttentionHref(orgSlug: string, item: DashboardAttentionItem): string {
  const query = item.href.includes('?') ? item.href.split('?')[1] : '';
  const base = orgBookingsPath(orgSlug);
  return query ? `${base}?${query}` : base;
}

export function OrgPendingActionsCard({
  orgSlug,
  defaultPropertySlug: _defaultPropertySlug,
  items,
}: Props) {
  const criticalCount = items.filter((item) => item.severity === 'critical').length;

  return (
    <section className="surface-card min-w-0 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-section-title text-foreground font-bold">Pending Actions</p>
        {criticalCount > 0 ? (
          <span className="bg-destructive text-destructive-foreground inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold">
            {criticalCount}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">All caught up</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const style = SEVERITY_STYLES[item.severity];
            const Icon = style.icon;
            const href = orgAttentionHref(orgSlug, item);

            const card = (
              <div
                className={cn(
                  'flex min-h-[44px] items-center gap-3 rounded-xl border p-3 transition-colors',
                  style.card
                )}
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    style.iconWrap
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="flex min-w-0 flex-1 items-center">
                  <p className="text-foreground text-sm font-semibold">
                    {item.count} {item.label.toLowerCase()}
                  </p>
                </div>
                {href ? (
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                ) : null}
              </div>
            );

            return href ? (
              <Link key={item.id} to={href} className="block min-w-0">
                {card}
              </Link>
            ) : (
              <div key={item.id}>{card}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
