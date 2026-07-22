import type { FinanceLedgerTypeFilter } from '@/features/dashboard/finance/lib/types';

import { AdminSingleSelectFilter } from '@/components/navigation/AdminSingleSelectFilter';

const TYPE_OPTIONS: { value: FinanceLedgerTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

type Props = {
  value: FinanceLedgerTypeFilter;
  onChange: (next: FinanceLedgerTypeFilter) => void;
};

export function FinanceTypeFilter({ value, onChange }: Props) {
  return (
    <AdminSingleSelectFilter
      options={TYPE_OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="Type filter"
      triggerWidthClassName="sm:w-[8.75rem]"
    />
  );
}
