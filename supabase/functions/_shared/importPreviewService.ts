/**
 * Import preview — map raw CSV rows + validate against importTargetSchemas.
 */

import { normalizeImportFieldValue } from './importNormalization.ts';
import {
  BOOKING_IMPORT_TARGET_FIELDS,
  getBookingImportTargetField,
  type ImportTargetFieldType,
} from './importTargetSchemas.ts';

export type ImportValidationError = {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ImportColumnMappingEntry = {
  rawHeader: string;
  suggestedTarget: string | null;
  status: string;
};

export type ImportRowPreviewInput = {
  id: string;
  row_index: number;
  raw_data: Record<string, string>;
  validation_status: string;
};

export type ImportRowPreviewOutput = {
  id: string;
  row_index: number;
  mapped_data: Record<string, string | null>;
  resolved_property_id: string;
  validation_status: 'valid' | 'error' | 'skipped';
  validation_errors: ImportValidationError[];
};

export type ImportPreviewSummary = {
  total: number;
  valid: number;
  error: number;
  skipped: number;
  warning: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BOOLEAN_TRUTHY = new Set(['yes', 'y', 'true', '1', 't']);
const BOOLEAN_FALSY = new Set(['no', 'n', 'false', '0', 'f']);

function parseColumnMappingEntries(columnMapping: unknown): ImportColumnMappingEntry[] {
  if (!columnMapping || typeof columnMapping !== 'object') return [];
  const mappings = (columnMapping as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappings)) return [];
  return mappings
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const raw = entry as Record<string, unknown>;
      return {
        rawHeader: String(raw.rawHeader ?? ''),
        suggestedTarget:
          raw.suggestedTarget === null || typeof raw.suggestedTarget === 'string'
            ? raw.suggestedTarget
            : null,
        status: String(raw.status ?? ''),
      };
    })
    .filter((entry): entry is ImportColumnMappingEntry => Boolean(entry?.rawHeader));
}

export function buildHeaderToTargetMap(columnMapping: unknown): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of parseColumnMappingEntries(columnMapping)) {
    if (entry.suggestedTarget && entry.status !== 'skipped') {
      map.set(entry.rawHeader, entry.suggestedTarget);
    }
  }
  return map;
}

export function applyImportColumnMapping(
  rawData: Record<string, string>,
  headerToTarget: Map<string, string>
): Record<string, string | null> {
  const mapped: Record<string, string | null> = {};
  for (const [header, targetFieldId] of headerToTarget) {
    mapped[targetFieldId] = normalizeImportFieldValue(targetFieldId, rawData[header]);
  }
  return mapped;
}

function normalizeComparableUnit(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseBooleanValue(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (BOOLEAN_TRUTHY.has(lowered)) return 'Yes';
  if (BOOLEAN_FALSY.has(lowered)) return 'No';
  return null;
}

function validateFieldType(
  fieldId: string,
  fieldType: ImportTargetFieldType,
  value: string | null
): ImportValidationError | null {
  if (value === null || value === '') return null;

  switch (fieldType) {
    case 'email':
      if (!EMAIL_RE.test(value)) {
        return {
          field: fieldId,
          code: 'invalid_email',
          message: 'Invalid email address',
          severity: 'error',
        };
      }
      return null;
    case 'phone':
      if (!/\d/.test(value)) {
        return {
          field: fieldId,
          code: 'invalid_phone',
          message: 'Phone number has no digits',
          severity: 'error',
        };
      }
      return null;
    case 'date': {
      const normalized = normalizeImportFieldValue(fieldId, value);
      if (!normalized) {
        return {
          field: fieldId,
          code: 'invalid_date',
          message: 'Unrecognized date format',
          severity: 'error',
        };
      }
      return null;
    }
    case 'integer': {
      const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
      if (!Number.isFinite(parsed)) {
        return {
          field: fieldId,
          code: 'invalid_integer',
          message: 'Expected a whole number',
          severity: 'error',
        };
      }
      return null;
    }
    case 'decimal': {
      const parsed = Number.parseFloat(value.replace(/,/g, ''));
      if (!Number.isFinite(parsed)) {
        return {
          field: fieldId,
          code: 'invalid_decimal',
          message: 'Expected a number',
          severity: 'error',
        };
      }
      return null;
    }
    case 'boolean': {
      if (parseBooleanValue(value) === null) {
        return {
          field: fieldId,
          code: 'invalid_boolean',
          message: 'Expected yes/no or true/false',
          severity: 'error',
        };
      }
      return null;
    }
    default:
      return null;
  }
}

function validateRequiredFields(mappedData: Record<string, string | null>): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  for (const field of BOOKING_IMPORT_TARGET_FIELDS) {
    if (!field.required) continue;
    const value = mappedData[field.id];
    if (value === null || value === '') {
      errors.push({
        field: field.id,
        code: 'required',
        message: 'Required field is missing',
        severity: 'error',
      });
    }
  }
  return errors;
}

function validateFieldTypes(mappedData: Record<string, string | null>): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  for (const [fieldId, value] of Object.entries(mappedData)) {
    const field = getBookingImportTargetField(fieldId);
    if (!field || value === null || value === '') continue;
    const typeError = validateFieldType(fieldId, field.type, value);
    if (typeError) errors.push(typeError);
  }
  return errors;
}

function validateDateOrder(mappedData: Record<string, string | null>): ImportValidationError | null {
  const checkIn = mappedData.check_in_date;
  const checkOut = mappedData.check_out_date;
  if (!checkIn || !checkOut) return null;

  const inNorm = normalizeImportFieldValue('check_in_date', checkIn);
  const outNorm = normalizeImportFieldValue('check_out_date', checkOut);
  if (!inNorm || !outNorm) return null;

  const inParts = inNorm.split('-').map(Number);
  const outParts = outNorm.split('-').map(Number);
  if (inParts.length !== 3 || outParts.length !== 3) return null;

  const inDate = new Date(inParts[2], inParts[0] - 1, inParts[1]);
  const outDate = new Date(outParts[2], outParts[0] - 1, outParts[1]);
  if (outDate <= inDate) {
    return {
      field: 'check_out_date',
      code: 'date_order',
      message: 'Check-out must be after check-in',
      severity: 'error',
    };
  }
  return null;
}

function validateUnitMismatch(
  mappedData: Record<string, string | null>,
  propertyTowerAndUnit: string | null,
  propertyName: string | null
): ImportValidationError | null {
  const rowUnit = mappedData.tower_and_unit_number;
  if (!rowUnit) return null;

  const rowNorm = normalizeComparableUnit(rowUnit);
  if (!rowNorm) return null;

  const candidates = [propertyTowerAndUnit, propertyName]
    .map((value) => normalizeComparableUnit(value))
    .filter(Boolean);

  if (candidates.length === 0) return null;

  const matches = candidates.some(
    (candidate) => rowNorm.includes(candidate) || candidate.includes(rowNorm)
  );

  if (matches) return null;

  const label = propertyTowerAndUnit || propertyName || 'this property';
  return {
    field: 'tower_and_unit_number',
    code: 'unit_mismatch',
    message: `Row mentions "${rowUnit}" but import target is ${label}`,
    severity: 'warning',
  };
}

export function previewImportRow(
  row: ImportRowPreviewInput,
  headerToTarget: Map<string, string>,
  propertyId: string,
  propertyTowerAndUnit: string | null,
  propertyName: string | null,
  preserveSkipped: boolean
): ImportRowPreviewOutput {
  if (preserveSkipped && row.validation_status === 'skipped') {
    return {
      id: row.id,
      row_index: row.row_index,
      mapped_data: applyImportColumnMapping(row.raw_data, headerToTarget),
      resolved_property_id: propertyId,
      validation_status: 'skipped',
      validation_errors: [],
    };
  }

  const mappedData = applyImportColumnMapping(row.raw_data, headerToTarget);

  for (const field of BOOKING_IMPORT_TARGET_FIELDS) {
    if (field.type !== 'boolean') continue;
    const raw = mappedData[field.id];
    if (raw === null || raw === '') continue;
    mappedData[field.id] = parseBooleanValue(raw) ?? raw;
  }

  const validationErrors: ImportValidationError[] = [
    ...validateRequiredFields(mappedData),
    ...validateFieldTypes(mappedData),
  ];

  const dateOrderError = validateDateOrder(mappedData);
  if (dateOrderError) validationErrors.push(dateOrderError);

  const unitWarning = validateUnitMismatch(mappedData, propertyTowerAndUnit, propertyName);
  if (unitWarning) validationErrors.push(unitWarning);

  const hasBlockingError = validationErrors.some((entry) => entry.severity === 'error');

  return {
    id: row.id,
    row_index: row.row_index,
    mapped_data: mappedData,
    resolved_property_id: propertyId,
    validation_status: hasBlockingError ? 'error' : 'valid',
    validation_errors: validationErrors,
  };
}

export function summarizeImportPreview(rows: ImportRowPreviewOutput[]): ImportPreviewSummary {
  let valid = 0;
  let error = 0;
  let skipped = 0;
  let warning = 0;

  for (const row of rows) {
    if (row.validation_status === 'valid') valid += 1;
    else if (row.validation_status === 'error') error += 1;
    else if (row.validation_status === 'skipped') skipped += 1;

    if (row.validation_errors.some((entry) => entry.severity === 'warning')) {
      warning += 1;
    }
  }

  return {
    total: rows.length,
    valid,
    error,
    skipped,
    warning,
  };
}
