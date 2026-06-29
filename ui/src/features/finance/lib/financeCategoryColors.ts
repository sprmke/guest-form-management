import { assignUniqueChartColors } from "@/components/charts/chartPalette";

/** Semantic category colors — may collide; charts run assignUniqueChartColors after. */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  rent: "#10b981",
  "base rate": "#10b981",
  amortization: "#6366f1",
  utilities: "#f97316",
  utility: "#f97316",
  supplies: "#8b5cf6",
  maintenance: "#84cc16",
  marketing: "#ec4899",
  staff: "#06b6d4",
  commission: "#d946ef",
  cleaning: "#a855f7",
  "cleaning fee": "#a855f7",
  parking: "#3b82f6",
  "parking fee": "#3b82f6",
  pet: "#f59e0b",
  "pet fee": "#f59e0b",
  "security deposit": "#14b8a6",
  damage: "#ef4444",
  "damage fee": "#ef4444",
  refund: "#22c55e",
  other: "#64748b",
  "stay net": "#10b981",
  "stay revenue": "#10b981",
  income: "#10b981",
};

function normalizeCategoryKey(category: string | null | undefined): string {
  return (category ?? "Other").trim().toLowerCase() || "other";
}

export function getFinanceCategoryLabel(
  category: string | null | undefined,
): string {
  const raw = (category ?? "Other").trim();
  return raw || "Other";
}

function getFinanceCategoryColor(
  category: string | null | undefined,
  index = 0,
): string {
  const key = normalizeCategoryKey(category);
  const mapped = CATEGORY_COLOR_MAP[key];
  if (mapped) return mapped;

  const palette = [
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#06b6d4",
    "#ef4444",
    "#f97316",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#64748b",
  ];
  return palette[index % palette.length] ?? "#64748b";
}

/** Ensure each breakdown slice in one chart gets a distinct color. */
export function assignFinanceBreakdownColors<
  T extends { label: string; color?: string },
>(slices: T[]): T[] {
  if (slices.length === 0) return slices;

  const colors = assignUniqueChartColors(
    slices.map((slice) => slice.label),
    (label, index) => getFinanceCategoryColor(label, index),
  );

  return slices.map((slice, index) => ({
    ...slice,
    color: colors[index]!,
  }));
}
