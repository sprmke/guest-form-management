import { Home } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { UnitTypesListEditor } from '@/features/dashboard/org/components/unit-types/UnitTypesListEditor';
import type { DevelopmentUnitType } from '@/features/dashboard/bookings/lib/unitTypes';

type Props = {
  list: DevelopmentUnitType[];
  disabled?: boolean;
  onChange: (next: DevelopmentUnitType[]) => void;
};

export function DevelopmentUnitTypesSection({ list, disabled = false, onChange }: Props) {
  return (
    <AdminSection id="unit-types" title="Unit types" icon={Home}>
      <UnitTypesListEditor list={list} disabled={disabled} onChange={onChange} />
    </AdminSection>
  );
}
