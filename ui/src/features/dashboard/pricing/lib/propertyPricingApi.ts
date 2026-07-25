import { scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import type { PricingHolidayRuleDto } from '@/features/dashboard/pricing/lib/phHolidayRules';
import type { PropertyPricingDefaults } from '@/features/dashboard/pricing/lib/pricingCompute';

import { supabase } from '@/lib/supabase/client';

export type PropertyPricingDto = PropertyPricingDefaults & {
  dateOverrides: Record<string, number>;
  bookedDateKeys: string[];
  holidayRules: PricingHolidayRuleDto[];
};

export type PropertyPricingPatch = Partial<PropertyPricingDefaults> & {
  dateOverrides?: Record<string, number>;
  holidayRules?: PricingHolidayRuleDto[];
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function pricingUrl(propertyId: string, month?: string): string {
  const base = scopedFunctionsUrl('/property-pricing', propertyId);
  if (!month) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}month=${encodeURIComponent(month)}`;
}

export async function fetchPropertyPricing(
  propertyId: string,
  month?: string
): Promise<PropertyPricingDto> {
  const res = await fetch(pricingUrl(propertyId, month), {
    headers: await authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? json?.message ?? 'Failed to load pricing');
  }
  return json.data as PropertyPricingDto;
}

export async function savePropertyPricing(
  propertyId: string,
  patch: PropertyPricingPatch
): Promise<PropertyPricingDto> {
  const res = await fetch(pricingUrl(propertyId), {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(patch),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? json?.message ?? 'Failed to save pricing');
  }
  return json.data as PropertyPricingDto;
}

export const PROPERTY_PRICING_QUERY_KEY = 'property-pricing';
