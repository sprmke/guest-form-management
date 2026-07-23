type CategoryRow = { category: string; count: number };

type Props = {
  rows: CategoryRow[];
};

export function MaintenanceByCategoryCard({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-separator border-b px-3 py-2.5 sm:px-4">
        <p className="text-overline">By category</p>
      </div>
      <ul className="divide-separator divide-y">
        {rows.map((row) => (
          <li
            key={row.category}
            className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
          >
            <span className="text-foreground truncate text-sm font-semibold">{row.category}</span>
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
