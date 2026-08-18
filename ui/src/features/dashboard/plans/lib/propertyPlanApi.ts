import { scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import type { PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';

import { supabase } from '@/lib/supabase/client';

export type PropertyPlanDto = {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  sortOrder: number;
  pricingModel: string;
  pricePhp: number | null;
  discountPercent: number;
  features: PlanFeatures;
  isDefault: boolean;
};

export type PropertySubscriptionDto = {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  pricingModel: string;
  status: string;
  pricePhpSnapshot: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEndsAt?: string | null;
};

export type PropertyPaymentTransactionDto = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  checkoutUrl: string | null;
  paymentMethodType: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type PropertyPlanResponse = {
  plans: PropertyPlanDto[];
  subscription: PropertySubscriptionDto | null;
  transactions?: PropertyPaymentTransactionDto[];
  pendingCheckoutUrl?: string | null;
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

export async function fetchPropertyPlan(propertyId: string): Promise<PropertyPlanResponse> {
  const res = await fetch(scopedFunctionsUrl('/property-plan', propertyId), {
    headers: await authHeaders(),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: PropertyPlanResponse;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Failed to load plans');
  }
  return json.data;
}

export async function assignPropertyFreePlan(
  propertyId: string,
  planId: string
): Promise<PropertySubscriptionDto | null> {
  const res = await fetch(scopedFunctionsUrl('/property-plan', propertyId), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ propertyId, planId }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { subscription: PropertySubscriptionDto | null };
  };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Failed to update plan');
  }
  return json.data?.subscription ?? null;
}

export async function createPropertyPlanCheckout(
  propertyId: string,
  planId: string
): Promise<{ checkoutUrl: string; transactionId: string }> {
  const res = await fetch(scopedFunctionsUrl('/create-subscription-checkout', propertyId), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ propertyId, planId }),
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

export async function renewPropertyPlanCheckout(
  propertyId: string
): Promise<{ checkoutUrl: string; transactionId: string }> {
  const res = await fetch(scopedFunctionsUrl('/create-subscription-checkout', propertyId), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ propertyId, renewCurrent: true }),
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
