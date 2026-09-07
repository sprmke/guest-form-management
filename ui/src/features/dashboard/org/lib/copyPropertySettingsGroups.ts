/**
 * UI catalog for Copy property settings — mirrors edge CLONE_GROUP_IDS.
 * Keep ids in sync with supabase/functions/_shared/propertySettingsCloneTypes.ts
 * (Vitest + Deno parity tests).
 */

import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

/** Same order as edge `CLONE_GROUP_IDS`. */
export const COPY_PROPERTY_SETTINGS_GROUP_IDS = [
  'propertyDetails',
  'listingContent',
  'amenities',
  'houseRules',
  'cancellationPolicy',
  'guestForm',
  'branding',
  'contact',
  'emailAutomations',
  'pricingRates',
  'smartPricing',
  'voucherConfig',
  'publicPages',
  'templates',
  'telegramNotifications',
  'inboxSnippets',
  'voiceReceptionist',
  'aiOverrides',
  'teamRoles',
  'media',
  'buildingForms',
  'marketingTemplates',
  'financeRecurring',
  'maintenanceRecurring',
] as const;

export type CopyPropertySettingsGroupId = (typeof COPY_PROPERTY_SETTINGS_GROUP_IDS)[number];

export type CopyPropertySettingsCategory =
  | 'listing'
  | 'pricing'
  | 'guestForm'
  | 'notifications'
  | 'templates'
  | 'publicPages'
  | 'marketing'
  | 'ai'
  | 'team'
  | 'finance'
  | 'maintenance';

export type CopyPropertySettingsGroupMeta = {
  id: CopyPropertySettingsGroupId;
  label: string;
  category: CopyPropertySettingsCategory;
  /** Initial checkbox state in the wizard. */
  defaultOn: boolean;
  /** Plan feature badge when the target plan may gate this group. */
  planFeature?: PlanFeatureKey;
  /** Delivery phase — UI may hide later phases until shipped. */
  phase: 1 | 2 | 3;
  /** Opt-in sub-choice (contact, credentials) — off by default. */
  optIn?: boolean;
};

export const COPY_PROPERTY_SETTINGS_CATEGORY_LABELS: Record<CopyPropertySettingsCategory, string> =
  {
    listing: 'Listing content',
    pricing: 'Pricing',
    guestForm: 'Guest form',
    notifications: 'Notifications & bot',
    templates: 'Templates',
    publicPages: 'Public pages',
    marketing: 'Marketing',
    ai: 'AI & voice',
    team: 'Team roles',
    finance: 'Recurring finance',
    maintenance: 'Recurring maintenance',
  };

export const COPY_PROPERTY_SETTINGS_GROUPS: CopyPropertySettingsGroupMeta[] = [
  {
    id: 'propertyDetails',
    label: 'Property details',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'listingContent',
    label: 'Description',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'amenities',
    label: 'Amenities',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'houseRules',
    label: 'House rules',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'cancellationPolicy',
    label: 'Cancellation policy',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'branding',
    label: 'Brand & socials',
    category: 'listing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'contact',
    label: 'Contact details',
    category: 'listing',
    defaultOn: false,
    phase: 1,
    optIn: true,
  },
  {
    id: 'media',
    label: 'Photos & videos',
    category: 'listing',
    defaultOn: true,
    phase: 2,
  },
  {
    id: 'guestForm',
    label: 'Guest form toggles',
    category: 'guestForm',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'pricingRates',
    label: 'Rates & fees',
    category: 'pricing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'smartPricing',
    label: 'Smart Pricing',
    category: 'pricing',
    defaultOn: true,
    planFeature: 'smartPricing',
    phase: 1,
  },
  {
    id: 'voucherConfig',
    label: 'Voucher config',
    category: 'pricing',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'emailAutomations',
    label: 'Email automations',
    category: 'notifications',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'telegramNotifications',
    label: 'Telegram notifications',
    category: 'notifications',
    defaultOn: true,
    planFeature: 'telegramNotifications',
    phase: 1,
  },
  {
    id: 'inboxSnippets',
    label: 'Inbox snippets',
    category: 'notifications',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'templates',
    label: 'Templates',
    category: 'templates',
    defaultOn: true,
    planFeature: 'customTemplates',
    phase: 1,
  },
  {
    id: 'publicPages',
    label: 'Public pages',
    category: 'publicPages',
    defaultOn: true,
    phase: 1,
  },
  {
    id: 'buildingForms',
    label: 'Building forms',
    category: 'guestForm',
    defaultOn: true,
    phase: 2,
  },
  {
    id: 'marketingTemplates',
    label: 'Marketing designs',
    category: 'marketing',
    defaultOn: true,
    planFeature: 'marketingStudio',
    phase: 2,
  },
  {
    id: 'voiceReceptionist',
    label: 'Voice receptionist',
    category: 'ai',
    defaultOn: true,
    planFeature: 'aiReceptionist',
    phase: 1,
  },
  {
    id: 'aiOverrides',
    label: 'AI overrides',
    category: 'ai',
    defaultOn: true,
    planFeature: 'aiMonthlyCreditAllowance',
    phase: 1,
  },
  {
    id: 'teamRoles',
    label: 'Custom team roles',
    category: 'team',
    defaultOn: true,
    planFeature: 'customRoles',
    phase: 1,
  },
  {
    id: 'financeRecurring',
    label: 'Recurring finance',
    category: 'finance',
    defaultOn: false,
    phase: 3,
  },
  {
    id: 'maintenanceRecurring',
    label: 'Recurring maintenance',
    category: 'maintenance',
    defaultOn: false,
    phase: 3,
  },
];

export function copyPropertySettingsGroupsForPhase(
  maxPhase: 1 | 2 | 3 = 1
): CopyPropertySettingsGroupMeta[] {
  return COPY_PROPERTY_SETTINGS_GROUPS.filter((g) => g.phase <= maxPhase);
}

export function copyPropertySettingsGroupIds(): CopyPropertySettingsGroupId[] {
  return [...COPY_PROPERTY_SETTINGS_GROUP_IDS];
}
