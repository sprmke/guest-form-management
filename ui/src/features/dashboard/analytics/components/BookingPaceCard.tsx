import { useMemo, useState } from 'react';

import { Activity } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { AnalyticsPaceMonth } from '@/features/dashboard/analytics/lib/types';

import { AdminSurfaceCardHeader } from '@/components/shared/AdminSurfaceCardHeader';
import {
  SegmentedControl,
  cardHeaderSegmentedListClassName,
  cardHeaderSegmentedTriggerClassName,
} from '@/components/ui/sliding-tabs';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import {
  CHART_INCOME_COLOR,
  CHART_INFO_COLOR,
  chartAxisTick,
  defaultChartMargin,
  formatChartMoneyAxis,
} from '@/lib/charts/chartStyles';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Metric = 'reservations' | 'revenue';

type Props = {
  pace: AnalyticsPaceMonth[];
  className?: string;
};

function monthLabel(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export function BookingPaceCard({ pace, className }: Props) {
  const [metric, setMetric] = useState<Metric>('reservations');
  const isBelowMd = useIsBelowMd();
  const stroke = metric === 'reservations' ? CHART_INFO_COLOR : CHART_INCOME_COLOR;
  const lastYearStroke = 'hsl(var(--muted-foreground))';

  const chartData = useMemo(() => {
    const rows = pace.map((month) => ({
      label: monthLabel(month.monthStart),
      current: metric === 'reservations' ? month.cumulativeReservations : month.cumulativeRevenue,
      lastYear:
        metric === 'reservations'
          ? month.cumulativeReservationsLastYear
          : month.cumulativeRevenueLastYear,
    }));
    // Drop trailing months with nothing on either line so the curve doesn't trail into empty space.
    let end = rows.length;
    while (end > 2 && rows[end - 1].current === 0 && rows[end - 1].lastYear === 0) end -= 1;
    return rows.slice(0, end);
  }, [pace, metric]);

  return (
    <section
      className={cn(
        'surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <AdminSurfaceCardHeader
        icon={Activity}
        title="Booking pace"
        description="This year against last year, month by month"
        iconClassName="bg-muted/80"
        action={
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            size="dense"
            equalSegments
            listClassName={cardHeaderSegmentedListClassName}
            triggerClassName={cn(cardHeaderSegmentedTriggerClassName, 'capitalize')}
            aria-label="Pace metric"
            options={[
              { value: 'reservations', label: 'reservations' },
              { value: 'revenue', label: 'revenue' },
            ]}
          />
        }
      />

      <div className="h-[180px] w-full sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={defaultChartMargin(isBelowMd)}>
            <XAxis
              dataKey="label"
              tick={chartAxisTick(isBelowMd)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={chartAxisTick(isBelowMd)}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                metric === 'revenue'
                  ? formatChartMoneyAxis(Number(value))
                  : String(Math.round(Number(value)))
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const current = payload.find((p) => p.dataKey === 'current')?.value ?? 0;
                const lastYear = payload.find((p) => p.dataKey === 'lastYear')?.value ?? 0;
                const fmt = (v: number) => (metric === 'revenue' ? formatMoney(v) : String(v));
                return (
                  <div className="border-border bg-card rounded-lg border px-3 py-2 shadow-lg">
                    <p className="text-foreground text-sm font-semibold">{label}</p>
                    <p className="text-sm" style={{ color: stroke }}>
                      This year: {fmt(Number(current))}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Last year: {fmt(Number(lastYear))}
                    </p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="current" stroke={stroke} strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="lastYear"
              stroke={lastYearStroke}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: stroke }}
            aria-hidden
          />
          <span className="text-muted-foreground">This year</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="h-0 w-4 shrink-0 border-t-2 border-dashed"
            style={{ borderColor: lastYearStroke }}
            aria-hidden
          />
          <span className="text-muted-foreground">Last year</span>
        </li>
      </ul>
    </section>
  );
}
