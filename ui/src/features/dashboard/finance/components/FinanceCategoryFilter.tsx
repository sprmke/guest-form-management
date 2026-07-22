import { useMemo } from 'react';

import { AdminMultiSelectFilter } from '@/components/navigation/AdminMultiSelectFilter';

type Props = {
  categories: string[];
  value: string[];
  onChange: (next: string[]) => void;
};

export function FinanceCategoryFilter({ categories, value, onChange }: Props) {
  const options = useMemo(
    () => categories.map((category) => ({ value: category, label: category })),
    [categories]
  );

  return (
    <AdminMultiSelectFilter
      options={options}
      value={value}
      onChange={onChange}
      emptyLabel="All Categories"
      pluralUnit="categories"
      ariaLabel="Category filter"
      triggerWidthClassName="sm:w-[10.5rem]"
      panelScrollable
      emptyMessage="No categories"
    />
  );
}
