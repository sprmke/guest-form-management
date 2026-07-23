import { formatMoney } from '@/utils/format/currency';
import { useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DashboardTrendPoint } from '@/features/dashboard/property/lib/types';

import {
  CHART_HEIGHT_CLASS,
  CHART_INCOME_COLOR,
  defaultChartMargin,
  formatChartMoneyAxis,
} from '@/lib/charts/chartStyles';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { SegmentedControl } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';

type ChartMetric = 'revenue' | 'bookings';

const EMPTY_REVENUE_AXIS_TICKS = [0, 1000, 2000, 3000, 4000] as const;
const EMPTY_REVENUE_AXIS_MAX = EMPTY_REVENUE_AXIS_TICKS.at(-1)!;

type Props = {
  data: DashboardTrendPoint[];
  isLoading?: boolean;
};

function OrgTrendTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardTrendPoint; value: number }>;
  metric: ChartMetric;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="border-border bg-card rounded-lg border px-3 py-2 shadow-lg">
      <p className="text-foreground text-sm font-semibold">{point.label}</p>
      {metric === 'revenue' ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {formatMoney(point.revenue)}
        </p>
      ) : (
        <p className="text-sm text-sky-600 dark:text-sky-400">
          {point.bookings} booking{point.bookings === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export function OrgRevenueBookingsChart({ data, isLoading }: Props) {
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const isBelowMd = useIsBelowMd();
  const stroke = metric === 'revenue' ? CHART_INCOME_COLOR : '#0ea5e9';
  const gradientId = metric === 'revenue' ? 'orgRevenueFill' : 'orgBookingsFill';

  const hasRevenueData = useMemo(() => data.some((point) => point.revenue > 0), [data]);
  const useEmptyRevenueAxis = metric === 'revenue' && !hasRevenueData;

  return (
    <section className="surface-card min-w-0 p-3 sm:p-4 lg:col-span-2">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-section-title text-foreground font-bold">Revenue Overview</p>
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          listClassName="border p-0.5"
          triggerClassName="min-h-[36px] px-3 text-xs font-semibold capitalize sm:min-h-[32px]"
          aria-label="Chart metric"
          options={[
            { value: 'revenue', label: 'revenue' },
            { value: 'bookings', label: 'bookings' },
          ]}
        />
      </div>

      <div className={cn(CHART_HEIGHT_CLASS, isLoading && 'animate-pulse opacity-60')}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={defaultChartMargin(isBelowMd)}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isBelowMd ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isBelowMd ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                metric === 'revenue'
                  ? formatChartMoneyAxis(Number(value))
                  : String(Math.round(Number(value)))
              }
              domain={useEmptyRevenueAxis ? [0, EMPTY_REVENUE_AXIS_MAX] : undefined}
              ticks={useEmptyRevenueAxis ? [...EMPTY_REVENUE_AXIS_TICKS] : undefined}
              allowDecimals={metric === 'bookings'}
            />
            <Tooltip
              content={({ active, payload }) => (
                <OrgTrendTooltip
                  active={active}
                  payload={payload as Array<{ payload: DashboardTrendPoint; value: number }>}
                  metric={metric}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
