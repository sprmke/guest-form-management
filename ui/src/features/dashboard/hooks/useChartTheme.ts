import { useEffect, useState } from 'react';

export type ChartTheme = {
  primary: string;
  primarySoft: string;
  sky: string;
  skySoft: string;
  amber: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
};

function readDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function buildTheme(dark: boolean): ChartTheme {
  if (dark) {
    return {
      primary: 'hsl(168 65% 45%)',
      primarySoft: 'hsla(168, 65%, 45%, 0.2)',
      sky: 'hsl(199 89% 55%)',
      skySoft: 'hsla(199, 89%, 55%, 0.18)',
      amber: 'hsl(38 92% 55%)',
      grid: 'hsla(160, 12%, 30%, 0.45)',
      axis: 'hsl(150 10% 58%)',
      tooltipBg: 'hsl(160 18% 11%)',
      tooltipBorder: 'hsl(160 12% 22%)',
    };
  }
  return {
    primary: 'hsl(168 65% 40%)',
    primarySoft: 'hsla(168, 65%, 40%, 0.15)',
    sky: 'hsl(199 89% 48%)',
    skySoft: 'hsla(199, 89%, 48%, 0.12)',
    amber: 'hsl(38 92% 50%)',
    grid: 'hsla(150, 12%, 86%, 0.7)',
    axis: 'hsl(160 10% 46%)',
    tooltipBg: 'hsl(0 0% 100%)',
    tooltipBorder: 'hsl(150 12% 90%)',
  };
}

/** Theme-aware chart colors (tracks `.dark` on `<html>`). */
export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(readDark);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(readDark()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return buildTheme(dark);
}

/** Nice Y-axis domain for currency / count charts. */
export function chartYDomain(
  values: number[],
  kind: 'money' | 'count',
): [number, number] {
  const max = Math.max(0, ...values);
  if (max === 0) return kind === 'money' ? [0, 10000] : [0, 5];
  if (kind === 'money') {
    const padded = max * 1.12;
    const step =
      padded >= 100_000 ? 20_000 : padded >= 50_000 ? 10_000 : padded >= 10_000 ? 2_000 : padded >= 2_000 ? 500 : 100;
    const top = Math.ceil(padded / step) * step;
    return [0, top];
  }
  const top = Math.max(5, Math.ceil(max * 1.15));
  return [0, top];
}

export function formatMoneyAxis(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return `₱${value}`;
}
