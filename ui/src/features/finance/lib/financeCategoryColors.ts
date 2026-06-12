/** Palette aligned with property-management-app payment category colors. */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  rent: "#10b981",
  "base rate": "#10b981",
  amortization: "#6366f1",
  utilities: "#f97316",
  utility: "#f97316",
  supplies: "#8b5cf6",
  maintenance: "#6366f1",
  marketing: "#ec4899",
  staff: "#06b6d4",
  commission: "#ec4899",
  cleaning: "#8b5cf6",
  "cleaning fee": "#8b5cf6",
  parking: "#3b82f6",
  "parking fee": "#3b82f6",
  pet: "#f59e0b",
  "pet fee": "#f59e0b",
  "security deposit": "#06b6d4",
  damage: "#ef4444",
  "damage fee": "#ef4444",
  refund: "#14b8a6",
  other: "#64748b",
  "stay net": "#10b981",
  "stay revenue": "#10b981",
  income: "#10b981",
};

const FALLBACK_PALETTE = [
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

function normalizeCategoryKey(category: string | null | undefined): string {
  return (category ?? "Other").trim().toLowerCase() || "other";
}

export function getFinanceCategoryLabel(
  category: string | null | undefined,
): string {
  const raw = (category ?? "Other").trim();
  return raw || "Other";
}

export function getFinanceCategoryColor(
  category: string | null | undefined,
  index = 0,
): string {
  const key = normalizeCategoryKey(category);
  const mapped = CATEGORY_COLOR_MAP[key];
  if (mapped) return mapped;
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] ?? "#64748b";
}
