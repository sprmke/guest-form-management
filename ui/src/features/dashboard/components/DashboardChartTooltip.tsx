import type { ReactNode } from 'react';
import type { ChartTheme } from '@/features/dashboard/hooks/useChartTheme';

type Props = {
  theme: ChartTheme;
  title: string;
  rows: Array<{ label: string; value: ReactNode; accent?: string }>;
};

export function DashboardChartTooltip({ theme, title, rows }: Props) {
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 text-xs shadow-elevated"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
      }}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className="font-semibold tabular-nums text-foreground"
              style={row.accent ? { color: row.accent } : undefined}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
