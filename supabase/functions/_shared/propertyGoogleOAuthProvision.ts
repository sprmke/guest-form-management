/**
 * Auto-provision Google Calendar + Spreadsheet when a property connects Google OAuth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { invalidateAppSettingsCache } from './appSettings.ts';
import { ensurePropertySettings } from './propertySettingsSeed.ts';

/** Column headers A–BA — keep in sync with sheetsService.formatDbRowForSheet. */
export const KAME_BOOKINGS_SHEET_HEADERS = [
  'Booking ID',
  'Facebook/Airbnb Name',
  'Primary Guest Name',
  'Email',
  'Phone Number',
  'Address',
  'Nationality',
  'Check-in Date',
  'Check-in Time',
  'Check-out Date',
  'Check-out Time',
  'Number of Nights',
  'Number of Adults',
  'Number of Children',
  'Guest 2',
  'Guest 3',
  'Guest 4',
  'Guest 5',
  'Need Parking',
  'Car Plate',
  'Car Brand/Model',
  'Car Color',
  'Has Pets',
  'Pet Name',
  'Pet Breed',
  'Pet Age',
  'Vaccination Date',
  'How Found Us',
  'Find Us Details',
  'Special Requests',
  'Valid ID URL',
  'Downpayment receipt URL',
  'Pet Vaccination URL',
  'Pet Image URL',
  'Created At',
  'Updated At',
  'Status',
  'booking_rate',
  'down_payment',
  'balance',
  'security_deposit',
  'parking_rate_guest',
  'parking_rate_paid',
  'pet_fee',
  'approved_gaf_pdf_url',
  'approved_pet_pdf_url',
  'sd_refund_amount',
  'sd_refund_receipt_url',
  'status_updated_at',
  'guest_additional_fee',
  'guest_balance_paid_amount',
  'guest_balance_payment_receipt_url',
  'Booking Source',
] as const;

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

function calendarTitle(propertyName: string): string {
  return `Kame Home — ${propertyName.trim() || 'Property'}`;
}

function spreadsheetTitle(propertyName: string): string {
  return `Kame Home — ${propertyName.trim() || 'Property'} Bookings`;
}

export async function createPropertyCalendar(
  accessToken: string,
  propertyName: string
): Promise<string> {
  const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: calendarTitle(propertyName),
      timeZone: 'Asia/Manila',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Calendar create failed (${resp.status}): ${body}`);
  }

  const json = (await resp.json()) as { id?: string };
  if (!json.id) throw new Error('Calendar create returned no id');
  return json.id;
}

export async function createPropertySpreadsheet(
  accessToken: string,
  propertyName: string
): Promise<string> {
  const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: spreadsheetTitle(propertyName) },
      sheets: [{ properties: { title: 'Bookings' } }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spreadsheet create failed (${resp.status}): ${body}`);
  }

  const json = (await resp.json()) as { spreadsheetId?: string };
  if (!json.spreadsheetId) {
    throw new Error('Spreadsheet create returned no spreadsheetId');
  }

  const headerResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(json.spreadsheetId)}/values/Bookings!A1:BA1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [Array.from(KAME_BOOKINGS_SHEET_HEADERS)],
      }),
    }
  );

  if (!headerResp.ok) {
    const body = await headerResp.text();
    throw new Error(`Spreadsheet header row failed (${headerResp.status}): ${body}`);
  }

  return json.spreadsheetId;
}

export async function provisionPropertyGoogleResources(
  accessToken: string,
  propertyName: string,
  options: { createCalendar?: boolean; createSpreadsheet?: boolean }
): Promise<{ calendarId?: string; spreadsheetId?: string }> {
  const out: { calendarId?: string; spreadsheetId?: string } = {};

  if (options.createCalendar) {
    out.calendarId = await createPropertyCalendar(accessToken, propertyName);
  }
  if (options.createSpreadsheet) {
    out.spreadsheetId = await createPropertySpreadsheet(accessToken, propertyName);
  }

  return out;
}

export async function persistProvisionedGoogleIds(
  propertyId: string,
  ids: { calendarId?: string; spreadsheetId?: string }
): Promise<void> {
  const patch: Record<string, string> = {};
  if (ids.calendarId?.trim()) patch.google_calendar_id = ids.calendarId.trim();
  if (ids.spreadsheetId?.trim()) {
    patch.google_spreadsheet_id = ids.spreadsheetId.trim();
  }
  if (Object.keys(patch).length === 0) return;

  await ensurePropertySettings(propertyId);

  const { error } = await supabaseAdmin()
    .from('app_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('property_id', propertyId);

  if (error) {
    throw new Error(`Failed to save Google resource IDs: ${error.message}`);
  }

  invalidateAppSettingsCache(propertyId);
}
