/**
 * Per-property automation master switches (`app_settings.automation_toggles`).
 * Email only — Telegram is controlled per property in telegram_*_settings.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export const PROPERTY_AUTOMATION_TOGGLE_KEYS = [
  'emailNewBookingRequest',
  'emailGafRequest',
  'emailBookingAcknowledgement',
  'emailPetRequest',
  'emailParkingBroadcast',
  'emailReadyForCheckin',
  'emailSdRefundCheckout',
] as const;

export type PropertyAutomationToggleKey = (typeof PROPERTY_AUTOMATION_TOGGLE_KEYS)[number];

export type PropertyAutomationToggles = Record<PropertyAutomationToggleKey, boolean>;

export const DEFAULT_PROPERTY_AUTOMATION_TOGGLES: PropertyAutomationToggles = {
  emailNewBookingRequest: true,
  emailGafRequest: true,
  emailBookingAcknowledgement: true,
  emailPetRequest: true,
  emailParkingBroadcast: true,
  emailReadyForCheckin: true,
  emailSdRefundCheckout: true,
};

export function mergePropertyAutomationToggles(raw: unknown): PropertyAutomationToggles {
  const merged = { ...DEFAULT_PROPERTY_AUTOMATION_TOGGLES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return merged;
  }
  const record = raw as Record<string, unknown>;
  for (const key of PROPERTY_AUTOMATION_TOGGLE_KEYS) {
    if (typeof record[key] === 'boolean') {
      merged[key] = record[key];
    }
  }
  return merged;
}

export function parsePropertyAutomationTogglesPatch(
  body: unknown
): Partial<PropertyAutomationToggles> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const patch: Partial<PropertyAutomationToggles> = {};
  for (const key of PROPERTY_AUTOMATION_TOGGLE_KEYS) {
    if (typeof record[key] === 'boolean') {
      patch[key] = record[key];
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

async function loadAutomationTogglesRaw(propertyId: string): Promise<unknown> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const { data, error } = await supabase
    .from('app_settings')
    .select('automation_toggles')
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) {
    console.warn('[propertyAutomationToggles] load failed:', error.message);
    return null;
  }

  return data?.automation_toggles ?? null;
}

export async function resolvePropertyAutomationToggles(
  propertyId: string
): Promise<PropertyAutomationToggles> {
  const raw = await loadAutomationTogglesRaw(propertyId);
  return mergePropertyAutomationToggles(raw);
}

export async function propertyAutomationEnabled(
  propertyId: string | null | undefined,
  key: PropertyAutomationToggleKey
): Promise<boolean> {
  if (!propertyId) return true;
  const toggles = await resolvePropertyAutomationToggles(propertyId);
  return toggles[key];
}
