import type { ReactNode } from 'react';

import { Link, useParams } from 'react-router-dom';

import { CalendarClock } from 'lucide-react';

import { MetricInfoDot } from '@/features/dashboard/analytics/components/MetricInfoDot';
import type { AnalyticsForward, AnalyticsPickup } from '@/features/dashboard/analytics/lib/types';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  forward: AnalyticsForward;
  pickup: AnalyticsPickup;
  className?: string;
};

function MetricCell({
  label,
  metric,
  metricLabel,
  value,
  detail,
  className,
}: {
  label: string;
  metric: 'occupancyOnBooks' | 'revenueOnBooks' | 'pickup';
  metricLabel: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex items-center gap-0.5">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <MetricInfoDot metric={metric} label={metricLabel} />
      </div>
      <div className="text-foreground text-2xl font-bold tabular-nums">{value}</div>
      {detail ? (
        <div className="text-muted-foreground text-xs leading-relaxed">{detail}</div>
      ) : null}
    </div>
  );
}

export function NextNinetyDaysCard({ forward, pickup, className }: Props) {
  const { orgSlug = '', propertySlug = '' } = useParams<{
    orgSlug: string;
    propertySlug: string;
  }>();
  const clamped = Math.max(0, Math.min(100, forward.occupancyOnBooks));
  const openNights = forward.nightsAvailable - forward.nightsBooked;

  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader
        icon={CalendarClock}
        title="Next 90 days"
        iconClassName="bg-muted/80"
      />

      <div className="sm:divide-border mt-1 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x">
        <MetricCell
          label="Booked nights"
          metric="occupancyOnBooks"
          metricLabel="booked nights"
          value={`${clamped}%`}
          className="sm:pr-6"
          detail={
            <div className="space-y-2">
              <div className="bg-muted h-1.5 w-full max-w-[10rem] overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${clamped}%` }}
                />
              </div>
              <p>
                {forward.nightsBooked} of {forward.nightsAvailable} nights reserved
              </p>
            </div>
          }
        />

        <MetricCell
          label="Confirmed revenue"
          metric="revenueOnBooks"
          metricLabel="confirmed revenue"
          value={formatMoney(forward.revenueOnBooks)}
          className="sm:px-6"
          detail={
            openNights > 0 ? (
              <p>
                {openNights} open night{openNights === 1 ? '' : 's'} left ·{' '}
                <Link
                  to={propertySectionPath(orgSlug, propertySlug, 'pricing')}
                  className="text-primary font-medium hover:underline"
                >
                  Adjust pricing
                </Link>
              </p>
            ) : (
              <p>All nights in this window are booked</p>
            )
          }
        />

        <MetricCell
          label="Last 7 days"
          metric="pickup"
          metricLabel="new bookings"
          value={pickup.last7Days}
          className="sm:pl-6"
          detail={<p>{pickup.last30Days} new in the last 30 days</p>}
        />
      </div>
    </section>
  );
}
