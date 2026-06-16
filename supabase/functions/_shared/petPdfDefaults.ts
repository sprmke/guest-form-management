/** Shared pet PDF helpers — keep tower/unit parsing in sync with ui/src/lib/petDefaults.ts */

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
