import { Users } from 'lucide-react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { AnalyticsDistributions } from '@/features/dashboard/analytics/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { CHART_INFO_COLOR, chartAxisTick, defaultChartMargin } from '@/lib/charts/chartStyles';
import { cn } from '@/lib/utils';

type Props = {
  guestAge: AnalyticsDistributions['guestAge'];
  guestOrigins: AnalyticsDistributions['guestOrigins'];
  className?: string;
};

const AGE_ORDER = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Unknown'];

const PANEL_MIN_H = 'min-h-[188px]';

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className={cn('relative w-full flex-1', PANEL_MIN_H)}>
      <div
        className="border-border/60 absolute inset-x-0 bottom-5 border-b border-dashed"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <p className="text-muted-foreground text-center text-xs">{message}</p>
      </div>
    </div>
  );
}

function GuestAgeChart({
  data,
  isBelowMd,
}: {
  data: Array<{ bucket: string; count: number }>;
  isBelowMd: boolean;
}) {
  return (
    <div className={cn('w-full flex-1', PANEL_MIN_H)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ ...defaultChartMargin(isBelowMd), top: 16, bottom: 4 }}
          barCategoryGap="18%"
        >
          <XAxis
            dataKey="bucket"
            tick={chartAxisTick(isBelowMd)}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={8}
            height={36}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const point = payload[0].payload as { bucket: string; count: number };
              return (
                <div className="border-border bg-card rounded-lg border px-3 py-2 shadow-lg">
                  <p className="text-foreground text-sm font-semibold">{point.bucket}</p>
                  <p className="text-sm" style={{ color: CHART_INFO_COLOR }}>
                    {point.count} {point.count === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill={CHART_INFO_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36}>
            <LabelList
              dataKey="count"
              position="top"
              fill="hsl(var(--muted-foreground))"
              fontSize={isBelowMd ? 10 : 11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GuestOriginsList({ origins }: { origins: AnalyticsDistributions['guestOrigins'] }) {
  const topOrigins = origins.slice(0, 6);

  if (topOrigins.length === 0) {
    return <ChartEmptyState message="No guest origins for this range yet" />;
  }

  return (
    <ul className={cn('flex w-full flex-1 flex-col justify-center gap-2.5', PANEL_MIN_H)}>
      {topOrigins.map((origin) => (
        <li
          key={origin.origin}
          className="grid grid-cols-[minmax(0,5.5rem)_1fr_2.25rem] items-center gap-2"
        >
          <span className="truncate text-sm">{origin.origin}</span>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(origin.pct, 2)}%`,
                backgroundColor: CHART_INFO_COLOR,
              }}
            />
          </div>
          <span className="text-muted-foreground text-right text-xs tabular-nums">
            {origin.pct}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GuestInsightsCard({ guestAge, guestOrigins, className }: Props) {
  const isBelowMd = useIsBelowMd();
  const sortedAge = [...guestAge]
    .filter((entry) => entry.bucket !== 'Unknown')
    .sort((a, b) => AGE_ORDER.indexOf(a.bucket) - AGE_ORDER.indexOf(b.bucket));
  const hasAgeSignal = sortedAge.some((entry) => entry.count > 0);

  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader icon={Users} title="Who's booking" iconClassName="bg-muted/80" />

      <div className="grid gap-6 sm:grid-cols-2 sm:items-stretch">
        <div className="flex min-w-0 flex-col">
          <p className="text-muted-foreground mb-3 text-xs font-medium">Guest age</p>
          {hasAgeSignal ? (
            <GuestAgeChart data={sortedAge} isBelowMd={isBelowMd} />
          ) : (
            <ChartEmptyState message="No age data for this range yet" />
          )}
        </div>

        <div className="sm:border-border flex min-w-0 flex-col sm:border-l sm:pl-6">
          <p className="text-muted-foreground mb-3 text-xs font-medium">Guest origins</p>
          <GuestOriginsList origins={guestOrigins} />
        </div>
      </div>
    </section>
  );
}
