export const CHART_INCOME_COLOR = "#10b981";
export const CHART_EXPENSE_COLOR = "#ef4444";
export const CHART_SKY_COLOR = "#3b82f6";
export const CHART_AMBER_COLOR = "#f59e0b";

export function formatChartMoneyAxis(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}k`;
  return `₱${value}`;
}

export function defaultChartMargin(isMobile: boolean) {
  return isMobile
    ? { top: 8, right: 4, left: -6, bottom: 0 }
    : { top: 10, right: 10, left: 0, bottom: 0 };
}

export function chartAxisTick(isMobile: boolean) {
  return {
    fill: "hsl(var(--muted-foreground))",
    fontSize: isMobile ? 10 : 12,
  };
}

export const CHART_HEIGHT_CLASS = "h-[220px] w-full min-w-0 sm:h-[300px]";
