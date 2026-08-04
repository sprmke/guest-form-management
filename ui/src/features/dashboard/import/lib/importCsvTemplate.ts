/**
 * Client-side CSV template for booking imports.
 * Caller supplies properties from list-properties (or org context).
 */

import type { Property } from '@/features/dashboard/org/types';

/** Canonical booking columns offered for host spreadsheets (snake_case). */
export const IMPORT_CSV_TEMPLATE_HEADERS = [
  'guest_facebook_name',
  'primary_guest_name',
  'guest_email',
  'guest_phone_number',
  'guest_address',
  'check_in_date',
  'check_out_date',
  'check_in_time',
  'check_out_time',
  'number_of_adults',
  'number_of_children',
  'number_of_nights',
  'booking_source',
  'booking_rate',
  'down_payment',
  'security_deposit',
  'need_parking',
  'has_pets',
  'guest2_name',
  'guest3_name',
  'guest_special_requests',
] as const;

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(lines: string[][]): string {
  return lines.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function propertyUnitLabel(property: Property): string {
  return (
    property.towerAndUnit?.trim() ||
    [property.tower, property.unitNumber].filter(Boolean).join(' ').trim() ||
    property.name
  );
}

export function buildImportCsvTemplate(properties: Property[]): string {
  const dataSection: string[][] = [
    [...IMPORT_CSV_TEMPLATE_HEADERS],
    IMPORT_CSV_TEMPLATE_HEADERS.map(() => ''),
  ];

  const referenceSection: string[][] = [
    [],
    ['# Delete the reference section below before uploading'],
    ['property_name', 'tower_and_unit', 'slug'],
    ...properties.map((property) => [
      property.name,
      propertyUnitLabel(property),
      property.slug,
    ]),
  ];

  return rowsToCsv([...dataSection, ...referenceSection]);
}

export function downloadImportCsvTemplate(properties: Property[], fileName = 'booking-import-template.csv'): void {
  const body = buildImportCsvTemplate(properties);
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
