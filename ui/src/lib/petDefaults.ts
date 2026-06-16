import {
  DEFAULT_GAF_TOWER_AND_UNIT_NUMBER,
  DEFAULT_GAF_UNIT_OWNER,
  type GafDetailsValues,
} from '@/lib/gafDefaults';

/** Pet PDF owner/unit fields — resolved from the same app_settings keys as GAF Details. */
export type PetDetailsValues = Pick<
  GafDetailsValues,
  'gafUnitOwner' | 'gafTowerAndUnitNumber'
>;

export const DEFAULT_PET_DETAILS: PetDetailsValues = {
  gafUnitOwner: DEFAULT_GAF_UNIT_OWNER,
  gafTowerAndUnitNumber: DEFAULT_GAF_TOWER_AND_UNIT_NUMBER,
};

export function extractTowerAndUnit(towerAndUnitNumber: string): {
  tower: string;
  unitNumber: string;
} {
  const match = towerAndUnitNumber.match(/^(.+?)\s+(\d+)$/);
  if (match) {
    return {
      tower: match[1].trim(),
      unitNumber: match[2].trim(),
    };
  }
  return {
    tower: towerAndUnitNumber,
    unitNumber: '',
  };
}

export function petDetailsToPdfFormFields(
  details: PetDetailsValues,
): Record<string, string> {
  const { tower, unitNumber } = extractTowerAndUnit(details.gafTowerAndUnitNumber);
  return {
    unitOwner: details.gafUnitOwner,
    unitTower: tower,
    unitNumber,
  };
}
