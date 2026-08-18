import type { PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';

export type PricingPlan = {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  sortOrder: number;
  pricingModel: 'subscription' | 'commission';
  pricePhp: number | null;
  discountPercent: number;
  billingInterval: string;
  commissionRatePercent: number | null;
  features: PlanFeatures;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PropertySubscriptionSummary = {
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  propertyStatus: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscription: {
    id: string;
    planId: string;
    planCode: string | null;
    planName: string | null;
    pricingModel: string;
    status: string;
    pricePhpSnapshot: number | null;
    commissionRatePercentSnapshot: number | null;
    updatedAt: string;
  } | null;
};
