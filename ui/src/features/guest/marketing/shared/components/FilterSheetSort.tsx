import { ArrowUpDown } from 'lucide-react';

type SortOption = { value: string; label: string };

type Props = {
  value: string;
  options: SortOption[];
  onChange: (value: string) => void;
};

/** Sort control for mobile filter sheets (“Filters & Sort”). */
export function FilterSheetSort({ value, options, onChange }: Props) {
  const safe = options.some((o) => o.value === value) ? value : (options[0]?.value ?? '');

  return (
    <div className="border-border space-y-2 border-b pb-6">
      <div className="flex items-center gap-2">
        <ArrowUpDown className="text-muted-foreground h-4 w-4" aria-hidden />
        <label htmlFor="filter-sheet-sort" className="text-foreground text-sm font-semibold">
          Sort
        </label>
      </div>
      <select
        id="filter-sheet-sort"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort results"
        className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 min-h-[44px] w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
