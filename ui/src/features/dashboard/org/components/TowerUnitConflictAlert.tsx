import { AlertCircle } from 'lucide-react';

import { duplicateTowerUnitMessage } from '@/features/dashboard/org/lib/propertyTowerUnitConflict';
import type { PropertyTowerUnitConflict } from '@/features/dashboard/org/lib/propertyTowerUnitConflict';

type Props = {
  tower: string;
  unitNumber: string;
  conflict: PropertyTowerUnitConflict | null;
};

export function TowerUnitConflictAlert({ tower, unitNumber, conflict }: Props) {
  if (!conflict) return null;

  return (
    <div
      className="border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-2 rounded-xl border p-3"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="text-[13px] leading-snug">{duplicateTowerUnitMessage(tower, unitNumber)}</p>
    </div>
  );
}
