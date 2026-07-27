import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  ALL_PROPERTY_TOWERS,
  DEFAULT_RESIDENCE_NAME,
  getTowersForResidence,
  isTowerInResidence,
} from './propertyResidences.ts';

export { isTowerInResidence } from './propertyResidences.ts';

export const PROPERTY_TOWERS = ALL_PROPERTY_TOWERS;
export type PropertyTower = (typeof ALL_PROPERTY_TOWERS)[number];

export function isPropertyTower(value: string): value is PropertyTower {
  return (ALL_PROPERTY_TOWERS as readonly string[]).includes(value);
}

export function isValidUnitNumber(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

export function formatTowerAndUnit(tower: string, unitNumber: string): string {
  return `${tower} ${unitNumber.trim()}`;
}

export type ParsedPropertyTowerUnit =
  | {
      ok: true;
      tower: PropertyTower;
      unitNumber: string;
      towerAndUnit: string;
    }
  | { ok: false; error: string };

function towerValidationError(residenceName: string): string {
  const towers = getTowersForResidence(residenceName);
  if (towers.length > 0) {
    return `Tower must be one of: ${towers.join(', ')}`;
  }
  return 'Tower is not valid for the selected residence';
}

/** Parse tower + unitNumber from request body (preferred) or legacy towerAndUnit. */
export function parsePropertyTowerUnitFromBody(
  body: Record<string, unknown>,
  options?: { residenceName?: string | null }
): ParsedPropertyTowerUnit {
  const residenceName =
    options?.residenceName?.trim() ||
    (typeof body.residenceName === 'string' ? body.residenceName.trim() : '') ||
    DEFAULT_RESIDENCE_NAME;

  const towerRaw = typeof body.tower === 'string' ? body.tower.trim() : '';
  const unitRaw = typeof body.unitNumber === 'string' ? body.unitNumber.trim() : '';

  const towerIsValid = (tower: string) =>
    residenceName ? isTowerInResidence(tower, residenceName) : isPropertyTower(tower);

  if (towerRaw || unitRaw) {
    if (!towerRaw || !unitRaw) {
      return { ok: false, error: 'Tower and unit number are both required' };
    }
    if (!towerIsValid(towerRaw)) {
      return { ok: false, error: towerValidationError(residenceName) };
    }
    if (!isValidUnitNumber(unitRaw)) {
      return { ok: false, error: 'Unit must be a 4-digit number' };
    }
    return {
      ok: true,
      tower: towerRaw as PropertyTower,
      unitNumber: unitRaw,
      towerAndUnit: formatTowerAndUnit(towerRaw, unitRaw),
    };
  }

  const legacy = typeof body.towerAndUnit === 'string' ? body.towerAndUnit.trim() : '';
  if (!legacy) {
    return { ok: false, error: 'Tower and unit number are required' };
  }

  for (const tower of ALL_PROPERTY_TOWERS) {
    const match = legacy.match(new RegExp(`^${tower}\\s+(\\d{4})$`));
    if (match) {
      if (!towerIsValid(tower)) {
        return { ok: false, error: towerValidationError(residenceName) };
      }
      return {
        ok: true,
        tower,
        unitNumber: match[1]!,
        towerAndUnit: formatTowerAndUnit(tower, match[1]!),
      };
    }
  }

  return {
    ok: false,
    error: 'Unit must use a valid tower and a 4-digit unit number',
  };
}

export async function lookupPropertyTowerUnitConflict(
  supabase: SupabaseClient,
  tower: string,
  unitNumber: string,
  excludePropertyId?: string
): Promise<{ id: string; name: string; orgName: string | null } | null> {
  let query = supabase
    .from('properties')
    .select('id, name, organizations(name)')
    .eq('tower', tower)
    .eq('unit_number', unitNumber)
    .limit(1);

  if (excludePropertyId) {
    query = query.neq('id', excludePropertyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[propertyTowerUnit] conflict lookup:', error.message);
    throw new Error('Failed to verify tower and unit availability');
  }

  const row = data?.[0];
  if (!row) return null;

  const orgRecord = row.organizations as { name?: string } | { name?: string }[] | null;
  const orgName = Array.isArray(orgRecord)
    ? (orgRecord[0]?.name ?? null)
    : (orgRecord?.name ?? null);

  return {
    id: row.id as string,
    name: row.name as string,
    orgName,
  };
}

export async function findPropertyTowerUnitConflict(
  supabase: SupabaseClient,
  tower: string,
  unitNumber: string,
  excludePropertyId?: string
): Promise<boolean> {
  const conflict = await lookupPropertyTowerUnitConflict(
    supabase,
    tower,
    unitNumber,
    excludePropertyId
  );
  return conflict !== null;
}

export const DUPLICATE_TOWER_UNIT_MESSAGE = 'A property with this tower and unit already exists';
