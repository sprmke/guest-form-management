import type { PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';

import { supabase } from '@/lib/supabase/client';

function supabaseBaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
}

export type OrgBundlePlanDto = {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  sortOrder: number;
  pricingModel: string;
  pricePhp: number | null;
  discountPercent: number;
  maxProperties: number | null;
  features: PlanFeatures;
  isDefault: boolean;
};

export type OrgPropertyDto = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type OrgSubscriptionDto = {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  pricingModel: string;
  status: string;
  pricePhpSnapshot: number | null;
  maxProperties: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

export type OrgPlanResponse = {
  plans: OrgBundlePlanDto[];
  properties: OrgPropertyDto[];
  subscription: OrgSubscriptionDto | null;
  assignedPropertyIds: string[];
  pendingCheckoutUrl: string | null;
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

export async function fetchOrgPlan(orgId: string): Promise<OrgPlanResponse> {
  const res = await fetch(`${supabaseBaseUrl()}/org-plan?orgId=${encodeURIComponent(orgId)}`, {
    headers: await authHeaders(),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: OrgPlanResponse;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Failed to load org plan');
  }
  return json.data;
}

export async function createOrgPlanCheckout(
  organizationId: string,
  planId: string,
  propertyIds: string[]
): Promise<{ checkoutUrl: string; transactionId: string }> {
  const res = await fetch(`${supabaseBaseUrl()}/create-org-subscription-checkout`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ organizationId, planId, propertyIds }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { checkoutUrl: string; transactionId: string };
  };
  if (!res.ok || !json.success || !json.data?.checkoutUrl) {
    throw new Error(json.error ?? 'Could not start checkout');
  }
  return json.data;
}
