/** Distinct segment colors for pie / breakdown charts (dark + light friendly). */
const CHART_SEGMENT_PALETTE = [
  "#10b981",
  "#6366f1",
  "#f97316",
  "#8b5cf6",
  "#84cc16",
  "#06b6d4",
  "#ef4444",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
  "#f59e0b",
  "#a855f7",
  "#64748b",
  "#eab308",
  "#d946ef",
  "#22c55e",
  "#0ea5e9",
  "#f43f5e",
] as const;

function normalizeColorKey(color: string): string {
  return color.trim().toLowerCase();
}

function hslChartColor(seed: number): string {
  const hue = (seed * 137.508) % 360;
  return `hsl(${Math.round(hue)} 62% 48%)`;
}

/**
 * Assign one color per category for a single chart render.
 * Prefers semantic colors first, then falls back to the palette / generated hues.
 */
export function assignUniqueChartColors(
  categories: string[],
  preferColor: (category: string, index: number) => string,
): string[] {
  const used = new Set<string>();
  const result: string[] = [];

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]!;
    const candidates: string[] = [
      preferColor(category, i),
      ...CHART_SEGMENT_PALETTE,
    ];

    for (let j = 0; j < 12; j++) {
      candidates.push(hslChartColor(i * 12 + j));
    }

    let assigned = candidates[0]!;
    for (const candidate of candidates) {
      const key = normalizeColorKey(candidate);
      if (!used.has(key)) {
        assigned = candidate;
        break;
      }
    }

    used.add(normalizeColorKey(assigned));
    result.push(assigned);
  }

  return result;
}
