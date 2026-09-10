import { Clock } from 'lucide-react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { AnalyticsDistributions } from '@/features/dashboard/analytics/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import {
  CHART_INCOME_COLOR,
  CHART_INFO_COLOR,
  chartAxisTick,
  defaultChartMargin,
} from '@/lib/charts/chartStyles';
import { cn } from '@/lib/utils';

type Props = {
  lengthOfStay: AnalyticsDistributions['lengthOfStay'];
  leadTime: AnalyticsDistributions['leadTime'];
  className?: string;
};

function MiniBarChart({
  data,
  dataKeyLabel,
  color,
  isBelowMd,
}: {
  data: Array<{ bucket: string; count: number }>;
  dataKeyLabel: string;
  color: string;
  isBelowMd: boolean;
}) {
  if (data.length === 0) {
    // Keep the chart footprint — a faint baseline + centered caption instead of
    // collapsing the whole panel to a line of text.
    return (
      <div className="relative h-[170px] w-full">
        <div
          className="border-border/60 absolute inset-x-0 bottom-5 border-b border-dashed"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-xs">No data for this range yet</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[170px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ ...defaultChartMargin(isBelowMd), top: 16 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="bucket"
            tick={chartAxisTick(isBelowMd)}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={6}
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
                  <p className="text-sm" style={{ color }}>
                    {point.count} {dataKeyLabel}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={44}>
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

export function LeadTimeLosCard({ lengthOfStay, leadTime, className }: Props) {
  const isBelowMd = useIsBelowMd();

  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader
        icon={Clock}
        title="How guests book"
        description="How far ahead they book, and how long they stay"
        iconClassName="bg-muted/80"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Booked this far ahead</p>
          <MiniBarChart
            data={leadTime}
            dataKeyLabel="bookings"
            color={CHART_INFO_COLOR}
            isBelowMd={isBelowMd}
          />
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Nights per stay</p>
          <MiniBarChart
            data={lengthOfStay}
            dataKeyLabel="bookings"
            color={CHART_INCOME_COLOR}
            isBelowMd={isBelowMd}
          />
        </div>
      </div>
    </section>
  );
}
