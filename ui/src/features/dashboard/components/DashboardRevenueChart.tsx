import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { formatMoney } from '@/features/admin/lib/formatters';
import { DashboardChartTooltip } from '@/features/dashboard/components/DashboardChartTooltip';
import {
  chartYDomain,
  formatMoneyAxis,
  useChartTheme,
} from '@/features/dashboard/hooks/useChartTheme';
import type { DashboardTrendPoint } from '@/features/dashboard/lib/types';

type Props = {
  data: DashboardTrendPoint[];
};

function RevenueTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardTrendPoint }>;
  theme: ReturnType<typeof useChartTheme>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <DashboardChartTooltip
      theme={theme}
      title={point.label}
      rows={[
        { label: 'Host net', value: formatMoney(point.net), accent: theme.primary },
        { label: 'Completed stays', value: point.stays },
      ]}
    />
  );
}

export function DashboardRevenueChart({ data }: Props) {
  const theme = useChartTheme();
  const isMobile = useIsBelowMd();
  const hasData = data.some((d) => d.net > 0 || d.stays > 0);
  const yDomain = useMemo(
    () => chartYDomain(data.map((d) => d.net), 'money'),
    [data],
  );
  const chartMargin = isMobile
    ? { top: 8, right: 0, left: -8, bottom: 0 }
    : { top: 12, right: 4, left: 0, bottom: 4 };

  if (!hasData) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-1.5 text-center sm:h-[260px]">
        <p className="text-sm font-semibold text-foreground">No completed revenue</p>
        <p className="max-w-xs text-caption">
          Completed stays with check-in in this period appear here by check-in
          date.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: theme.axis, fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 36 : 24}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: theme.axis, fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatMoneyAxis}
            width={isMobile ? 40 : 52}
          />
          <Tooltip content={<RevenueTooltip theme={theme} />} />
          <Area
            type="linear"
            dataKey="net"
            stroke={theme.primary}
            strokeWidth={2}
            fill="url(#dashboardRevenueFill)"
            animationDuration={700}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: 5,
              fill: theme.primary,
              stroke: theme.tooltipBg,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
