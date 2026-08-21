/**
 * Presentation layer for pricing tiers.
 *
 * Tiers are cumulative, so cards show only what a tier *adds* over the one below it
 * and the matrix carries the full picture. Every value here is derived from the plan
 * row — nothing is illustrative.
 */

import type { PlanFeatureKey, PlanFeatures } from '@/features/dashboard/plans/lib/planFeatures';
import {
  discountedPlanPricePhp,
  normalizePlanDiscountPercent,
} from '@/features/dashboard/plans/lib/planPricing';
import type {
  PropertyPlanDto,
  PropertySubscriptionDto,
} from '@/features/dashboard/plans/lib/propertyPlanApi';

import { formatManilaLongDate } from '@/utils/format/dates';

export type PlanFeatureGroup =
  'operations' | 'visibility' | 'marketing' | 'ai' | 'team' | 'managed';

export const PLAN_FEATURE_GROUP_LABELS: Record<PlanFeatureGroup, string> = {
  operations: 'Operations',
  visibility: 'Guest visibility',
  marketing: 'Marketing',
  ai: 'AI',
  team: 'Team',
  managed: 'Managed hosting',
};

/** `off` renders as a dash; `on` as a check; `text` as the measured value. */
export type PlanFeatureValue = { kind: 'on' } | { kind: 'off' } | { kind: 'text'; text: string };

export type PlanFeatureRow = {
  key: PlanFeatureKey;
  /** Matrix row label — stable across tiers. */
  label: string;
  group: PlanFeatureGroup;
  value: (features: PlanFeatures) => PlanFeatureValue;
  /** Higher means more capability. Drives added/removed detection between tiers. */
  rank: (features: PlanFeatures) => number;
  /** Card bullet + change-list wording for the tier that has it. */
  describe: (features: PlanFeatures) => string;
};

function boolRow(
  key: PlanFeatureKey,
  label: string,
  group: PlanFeatureGroup,
  describeAs = label
): PlanFeatureRow {
  return {
    key,
    label,
    group,
    value: (features) => ({ kind: features[key] === true ? 'on' : 'off' }),
    rank: (features) => (features[key] === true ? 1 : 0),
    describe: () => describeAs,
  };
}

const SEARCH_TIER_LABEL: Record<PlanFeatures['searchVisibilityTier'], string> = {
  none: 'Standard',
  top30: 'Top 30',
  top15: 'Top 15',
  top20: 'Top 30',
  top10: 'Top 15',
};

const SEARCH_TIER_RANK: Record<PlanFeatures['searchVisibilityTier'], number> = {
  none: 0,
  top30: 1,
  top15: 2,
  top20: 1,
  top10: 2,
};

/** Included on every tier — shown in Compare and on the Free card. */
export const PLAN_BASELINE_MATRIX_ROWS: { key: string; label: string }[] = [
  { key: 'baseline-dashboard', label: 'Dashboard overview' },
  { key: 'baseline-bookings', label: 'Manual booking management' },
  { key: 'baseline-guest-form', label: 'Public guest form' },
  { key: 'baseline-manual-docs', label: 'Manual document generation' },
  { key: 'baseline-finance', label: 'Finance management' },
  { key: 'baseline-maintenance', label: 'Maintenance reminders' },
  { key: 'baseline-notifications', label: 'Notifications' },
];

/** Core tools unlocked from Starter — not on Free in the compare matrix. */
export const PLAN_STARTER_MATRIX_ROWS: { key: string; label: string; minSortOrder: number }[] = [
  { key: 'starter-pricing', label: 'Pricing management', minSortOrder: 2 },
];

/** Managed-only rows — marketing copy on the Managed card, not entitlement keys. */
export const PLAN_MANAGED_MATRIX_ROWS: { key: string; label: string; managedOnly: true }[] = [
  { key: 'managed-limited-time', label: 'Ideal for hosts with limited time', managedOnly: true },
  {
    key: 'managed-transparency',
    label: 'Full transparency on bookings and finance',
    managedOnly: true,
  },
  {
    key: 'managed-passive-income',
    label: 'Earn from your listing with minimal work & supervision',
    managedOnly: true,
  },
  {
    key: 'managed-social-boosts',
    label: 'Free social media boosts across listing groups',
    managedOnly: true,
  },
  {
    key: 'managed-cleaning',
    label: 'Cleaning and maintenance staff available (separate fee)',
    managedOnly: true,
  },
];

/** Incremental bullets per tier card — host-facing copy, not entitlement keys. */
export const PLAN_TIER_CARD_GAINS: Record<string, string[]> = {
  free: [
    'Dashboard overview',
    'Manual booking management',
    'Public guest form',
    'Manual document generation',
    'Finance management',
    'Maintenance reminders',
    'Notifications',
  ],
  starter: [
    'Pricing management',
    'Public pages access & editor',
    'Automated document generation',
    'Verified badge eligible',
    'Up to 3 team members',
    'Template Management',
  ],
  growth: [
    'Up to 5 team members',
    '30 publishes per channel',
    'Top 30 search placement',
    'AI receipt and ID validation',
    'Recommended badge eligible',
    'Template Management',
    '1,000 AI credits per month',
  ],
  pro: [
    'Up to 10 team members',
    'Unlimited publishing',
    'Top 15 search placement',
    'AI content generation',
    'AI dashboard assistant',
    'AI receptionist',
    'AI chat auto-reply',
    '10,000 AI credits per month',
  ],
  managed: [
    '30,000 AI credits per month',
    "We'll manage everything, from bookings to operations, marketing, chat, reminders, etc",
    'Ideal for hosts with limited time',
    'Full transparency on bookings and finance',
    'Earn from your listing with minimal work & supervision',
    'Free social media boosts to help promote your listings across different groups',
    'Cleaning and maintenance staff available (separate fee)',
  ],
};

function normalizeGainLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Curated incremental bullets per tier card. Pro and Business lists are authoritative
 * (old middle/top tier features + new seat/publish/search adjustments).
 */
function resolveTierCardGains(
  plan: PropertyPlanDto,
  previous: PropertyPlanDto | null
): PlanFeatureChange[] {
  if (
    plan.code === 'free' ||
    plan.code === 'starter' ||
    plan.code === 'growth' ||
    plan.code === 'pro' ||
    plan.code === 'managed'
  ) {
    return planTierCardGains(plan.code);
  }

  const staticLabels = PLAN_TIER_CARD_GAINS[plan.code] ?? [];
  const seen = new Set(staticLabels.map(normalizeGainLabel));

  const merged: PlanFeatureChange[] = staticLabels.map((label, index) => ({
    key: `card-${plan.code}-static-${index}`,
    label,
  }));

  if (previous) {
    for (const gain of planFeatureGains(previous.features, plan.features)) {
      const normalized = normalizeGainLabel(gain.label);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(gain);
    }
  }

  return merged;
}

function planTierCardGains(planCode: string): PlanFeatureChange[] {
  const labels = PLAN_TIER_CARD_GAINS[planCode];
  if (!labels?.length) return [];
  return labels.map((label, index) => ({
    key: `card-${planCode}-${index}`,
    label,
  }));
}

/** Matrix row order — also the order bullets appear on a tier card when derived from features. */
export const PLAN_FEATURE_ROWS: PlanFeatureRow[] = [
  boolRow('automatedBookingFlow', 'Automated document generation', 'operations'),
  boolRow('customPages', 'Public pages access & editor', 'operations'),
  boolRow('marketingStudio', 'Template Management', 'operations'),
  boolRow('aiValidations', 'AI receipt and ID validation', 'operations'),
  boolRow('telegramNotifications', 'Telegram alerts', 'operations'),

  boolRow('verifiedBadgeEligible', 'Verified badge eligible', 'visibility'),
  boolRow('recommendedBadgeEligible', 'Recommended badge eligible', 'visibility'),
  {
    key: 'searchVisibilityTier',
    label: 'Search placement',
    group: 'visibility',
    value: (features) =>
      features.searchVisibilityTier === 'none'
        ? { kind: 'off' }
        : { kind: 'text', text: SEARCH_TIER_LABEL[features.searchVisibilityTier] },
    rank: (features) => SEARCH_TIER_RANK[features.searchVisibilityTier],
    describe: (features) => `${SEARCH_TIER_LABEL[features.searchVisibilityTier]} search placement`,
  },

  boolRow('aiMarketingGeneration', 'AI content generation', 'marketing'),
  {
    key: 'marketingPublishLimitPerGroup',
    label: 'Marketing publishes',
    group: 'marketing',
    value: (features) => {
      const limit = features.marketingPublishLimitPerGroup;
      if (limit === null) return { kind: 'text', text: 'Unlimited' };
      if (limit <= 0) return { kind: 'off' };
      return { kind: 'text', text: `${limit} / channel` };
    },
    rank: (features) => {
      const limit = features.marketingPublishLimitPerGroup;
      if (limit === null) return Number.POSITIVE_INFINITY;
      return limit;
    },
    describe: (features) =>
      features.marketingPublishLimitPerGroup === null
        ? 'Unlimited publishing'
        : `${features.marketingPublishLimitPerGroup} publishes per channel`,
  },

  boolRow('aiDashboardAssistant', 'AI dashboard assistant', 'ai'),
  boolRow('aiReceptionist', 'AI receptionist', 'ai'),
  boolRow('aiChatAutoReply', 'AI chat auto-reply', 'ai'),
  {
    key: 'aiMonthlyCreditAllowance',
    label: 'AI credits',
    group: 'ai',
    value: (features) =>
      features.aiMonthlyCreditAllowance > 0
        ? { kind: 'text', text: `${features.aiMonthlyCreditAllowance.toLocaleString()} / mo` }
        : { kind: 'off' },
    rank: (features) => features.aiMonthlyCreditAllowance,
    describe: (features) =>
      `${features.aiMonthlyCreditAllowance.toLocaleString()} AI credits per month`,
  },

  {
    key: 'teamManagement',
    label: 'Team members',
    group: 'team',
    value: (features) => {
      if (!features.teamManagement.enabled) return { kind: 'off' };
      const max = features.teamManagement.maxMembers;
      return { kind: 'text', text: max === null ? 'Unlimited' : `Up to ${max}` };
    },
    rank: (features) => {
      if (!features.teamManagement.enabled) return 0;
      return features.teamManagement.maxMembers ?? Number.POSITIVE_INFINITY;
    },
    describe: (features) => {
      const max = features.teamManagement.maxMembers;
      return max === null ? 'Unlimited team members' : `Up to ${max} team members`;
    },
  },
  boolRow(
    'fullyManagedByPlatform',
    "We'll manage everything, from bookings to operations, marketing, chat, reminders, etc",
    'managed',
    "We'll manage everything, from bookings to operations, marketing, chat, reminders, etc"
  ),
];

export const PLAN_FEATURE_GROUP_ORDER: PlanFeatureGroup[] = [
  'operations',
  'visibility',
  'marketing',
  'ai',
  'team',
  'managed',
];

export type PlanFeatureMatrixGroup = {
  group: PlanFeatureGroup | 'baseline';
  label: string;
  rows: Array<
    | PlanFeatureRow
    | { key: string; label: string; baseline: true }
    | { key: string; label: string; minSortOrder: number }
    | { key: string; label: string; managedOnly: true }
  >;
};

/** Drops rows that are off in every available tier so the matrix stays honest and short. */
export function planFeatureMatrixGroups(plans: PropertyPlanDto[]): PlanFeatureMatrixGroup[] {
  const meaningful = PLAN_FEATURE_ROWS.filter((row) =>
    plans.some((plan) => row.value(plan.features).kind !== 'off')
  );

  const featureGroups = PLAN_FEATURE_GROUP_ORDER.map((group) => {
    const rows = meaningful.filter((row) => row.group === group);
    if (group === 'managed') {
      const hasManaged = plans.some((plan) => plan.code === MANAGED_PLAN_CODE);
      return {
        group,
        label: PLAN_FEATURE_GROUP_LABELS[group],
        rows: [...rows, ...(hasManaged ? PLAN_MANAGED_MATRIX_ROWS : [])],
      };
    }
    return {
      group,
      label: PLAN_FEATURE_GROUP_LABELS[group],
      rows,
    };
  }).filter((entry) => entry.rows.length > 0);

  return [
    {
      group: 'baseline' as const,
      label: 'Core tools',
      rows: [
        ...PLAN_BASELINE_MATRIX_ROWS.map((row) => ({ ...row, baseline: true as const })),
        ...PLAN_STARTER_MATRIX_ROWS,
      ],
    },
    ...featureGroups,
  ];
}

export type PlanFeatureChange = {
  key: string;
  label: string;
};

/** Capabilities `to` has that `from` does not, in matrix order. */
export function planFeatureGains(from: PlanFeatures | null, to: PlanFeatures): PlanFeatureChange[] {
  return PLAN_FEATURE_ROWS.filter((row) => {
    const target = row.rank(to);
    if (target <= 0) return false;
    return from === null || target > row.rank(from);
  }).map((row) => ({ key: row.key, label: row.describe(to) }));
}

/** Capabilities `from` has that `to` drops — the honest half of a downgrade. */
export function planFeatureLosses(from: PlanFeatures, to: PlanFeatures): PlanFeatureChange[] {
  return PLAN_FEATURE_ROWS.filter((row) => {
    const current = row.rank(from);
    if (current <= 0) return false;
    return row.rank(to) < current;
  }).map((row) => ({ key: row.key, label: row.describe(from) }));
}

/** How many capabilities a tier actually turns on — Free is legitimately zero. */
export function planCapabilityCount(features: PlanFeatures): number {
  return PLAN_FEATURE_ROWS.filter((row) => row.rank(features) > 0).length;
}

export type PlanTier = {
  plan: PropertyPlanDto;
  /** Tier immediately below — the card's "everything in …" anchor. */
  previous: PropertyPlanDto | null;
  isCurrent: boolean;
  /** Highlighted as the catalog's recommended upgrade tier (not necessarily the next rung). */
  isNextStep: boolean;
  direction: PlanChangeDirection;
  /** Capabilities this tier adds over `previous`. */
  gains: PlanFeatureChange[];
  /** False when the tier below adds nothing, so the card skips the "everything in …" line. */
  inheritsFrom: string | null;
};

export type PlanChangeDirection = 'current' | 'upgrade' | 'downgrade';

/** Internal plan code for the tier we recommend hosts upgrade to (`pro` = Business). */
export const RECOMMENDED_PLAN_CODE = 'pro';

/** Managed tier — sales-assisted; no self-serve checkout. */
export const MANAGED_PLAN_CODE = 'managed';

/** Prefilled support ticket subject when a host asks about Managed. */
export const MANAGED_PLAN_INQUIRY_SUBJECT = 'Managed plan inquiry';

export function isManagedSalesPlan(code: string): boolean {
  return code === MANAGED_PLAN_CODE;
}

/** Sorted ladder with each tier's position relative to the active subscription. */
export function buildPlanTiers(
  plans: PropertyPlanDto[],
  currentPlanId: string | undefined
): PlanTier[] {
  const ordered = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = ordered.findIndex((plan) => plan.id === currentPlanId);

  return ordered.map((plan, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    const isCurrent = currentIndex >= 0 && index === currentIndex;

    let direction: PlanChangeDirection = 'upgrade';
    if (isCurrent) direction = 'current';
    else if (currentIndex >= 0 && index < currentIndex) direction = 'downgrade';

    const cardGains = resolveTierCardGains(plan, previous);

    return {
      plan,
      previous,
      isCurrent,
      isNextStep: plan.code === RECOMMENDED_PLAN_CODE && !isCurrent && direction === 'upgrade',
      direction,
      gains: cardGains,
      inheritsFrom: previous && plan.code !== 'free' ? planDisplayName(previous) : null,
    };
  });
}

/** Min height (px) for the feature list block so every tier card aligns in the rail. */
export const PLAN_TIER_GAIN_ROW_MIN_HEIGHT = 28;
export const PLAN_TIER_GAIN_ROW_GAP = 8;
const PLAN_TIER_INHERITS_BLOCK_MIN_HEIGHT = 32;

export function planTierFeatureAreaMinHeight(tiers: PlanTier[]): number {
  const maxGains = Math.max(0, ...tiers.map((tier) => tier.gains.length));
  const rows = Math.max(maxGains, 1);
  const listHeight = rows * PLAN_TIER_GAIN_ROW_MIN_HEIGHT + (rows - 1) * PLAN_TIER_GAIN_ROW_GAP;
  return PLAN_TIER_INHERITS_BLOCK_MIN_HEIGHT + listHeight;
}

/** Next tier above the active plan on the sorted ladder — null when already on the highest tier. */
export function nextUpgradePlan(
  plans: PropertyPlanDto[],
  currentPlanId: string | undefined
): PropertyPlanDto | null {
  const ordered = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = ordered.findIndex((plan) => plan.id === currentPlanId);
  if (currentIndex < 0) return ordered[0] ?? null;
  return ordered[currentIndex + 1] ?? null;
}

/** Primary CTA on the current-plan banner when a higher tier exists. */
export function upgradeBannerActionLabel(plan: PropertyPlanDto): string {
  if (isManagedSalesPlan(plan.code)) return 'Contact sales';
  return `Upgrade to ${planDisplayName(plan)}`;
}

export function planActionLabel(
  direction: PlanChangeDirection,
  hasCurrent: boolean,
  planCode?: string
): string {
  if (direction === 'current') return 'Current plan';
  if (planCode && isManagedSalesPlan(planCode)) return 'Contact sales';
  if (!hasCurrent) return 'Choose plan';
  return direction === 'downgrade' ? 'Downgrade' : 'Upgrade';
}

export type PlanPrice = {
  amount: string;
  /** Empty for free tiers so the card does not render a dangling `/month`. */
  suffix: string;
  /** Strikethrough list price when a discount is active. */
  compareAtAmount?: string;
  discountPercent?: number;
};

/** Host-facing discount label copy — whole percent only. */
export function planDiscountLabel(discountPercent: number): string {
  const percent = Math.floor(discountPercent);
  if (percent <= 0) return '';
  return `${percent}% off`;
}

const PESO_WHOLE = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function planPrice(
  plan: Pick<
    PropertyPlanDto,
    'isDefault' | 'pricePhp' | 'pricingModel' | 'code' | 'discountPercent'
  > & {
    /** Locked-in subscription amount — skips list/discount math. */
    chargedPricePhp?: number | null;
  }
): PlanPrice {
  if (plan.pricingModel === 'commission') {
    return { amount: '8% fee', suffix: 'per booking' };
  }

  if (plan.chargedPricePhp != null && Number.isFinite(plan.chargedPricePhp)) {
    const charged = Math.max(0, Math.floor(plan.chargedPricePhp));
    if (plan.isDefault || charged <= 0) return { amount: PESO_WHOLE.format(0), suffix: '/month' };
    return { amount: PESO_WHOLE.format(charged), suffix: '/month' };
  }

  const listPhp = Math.max(0, Math.floor(plan.pricePhp ?? 0));
  if (plan.isDefault || listPhp <= 0) return { amount: PESO_WHOLE.format(0), suffix: '/month' };

  const discountPercent = normalizePlanDiscountPercent(plan.discountPercent);
  const effectivePhp = discountedPlanPricePhp(listPhp, discountPercent);

  const result: PlanPrice = {
    amount: PESO_WHOLE.format(effectivePhp),
    suffix: '/month',
  };

  if (discountPercent > 0 && effectivePhp < listPhp) {
    result.compareAtAmount = PESO_WHOLE.format(listPhp);
    result.discountPercent = discountPercent;
  }

  return result;
}

/** One-line host-facing pitch — shown on tier cards below the plan name. */
const PLAN_HOST_PITCH: Record<string, string> = {
  free: 'Essential tools to manage your properties at no cost.',
  starter: 'Automate everyday operations and manage your team with ease.',
  growth: 'Reach more guests with greater publishing and search visibility.',
  pro: '    Simplify your management with AI-powered features.',
  managed: 'Let us handle your operations while you focus on growing your business.',
  commission: 'Pay only when you earn from a completed booking — no monthly fee.',
};

const WEAK_TAGLINES = new Set([
  'free',
  'starter',
  'growth',
  'pro',
  'managed',
  'level 1',
  'level 2',
  'level 3',
  'level 4',
  'level 5',
]);

/** Host-facing titles — stable catalog names, not internal "Level N" DB labels. */
export const PLAN_CODE_DISPLAY_NAME: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Pro',
  pro: 'Business',
  managed: 'Managed',
  commission: 'Commission',
};

/** Marketing pill on the card edge — not the same as the current-plan state. */
export const PLAN_PROMO_BADGE: Record<string, string> = {
  starter: 'Best value',
  growth: 'Most popular',
  pro: 'Recommended',
  managed: 'Hands-off hosting',
};

export function planPromoBadge(code: string): string | null {
  return PLAN_PROMO_BADGE[code] ?? null;
}

/** Plan title for hosts — prefers catalog name by `code`, not `pricing_plans.name`. */
export function planDisplayName(plan: Pick<PropertyPlanDto, 'code' | 'name' | 'tagline'>): string {
  const fromCode = PLAN_CODE_DISPLAY_NAME[plan.code];
  if (fromCode) return fromCode;

  const tagline = plan.tagline?.trim();
  if (tagline && !WEAK_TAGLINES.has(tagline.toLowerCase())) return tagline;

  return plan.name.trim() || 'Plan';
}

/** Resolve a stored subscription label when the full plan row is unavailable. */
export function planDisplayNameFromSubscription(
  subscription: Pick<PropertySubscriptionDto, 'planCode' | 'planName'> | null
): string {
  if (!subscription) return '';
  const fromCode = PLAN_CODE_DISPLAY_NAME[subscription.planCode];
  if (fromCode) return fromCode;
  return subscription.planName?.trim() || 'Plan';
}

/** Primary for upgrades; outline for current plan and downgrades. */
export function planSelectButtonVariant(
  isCurrent: boolean,
  direction: PlanChangeDirection
): 'default' | 'outline' {
  if (isCurrent || direction === 'downgrade') return 'outline';
  return 'default';
}

/** Card subtitle — prefers a host pitch over catalog taglines like "Starter". */
export function planTierPitch(plan: PropertyPlanDto): string | null {
  const pitch = PLAN_HOST_PITCH[plan.code];
  if (pitch) return pitch;

  const tagline = plan.tagline?.trim();
  if (!tagline) return null;
  if (WEAK_TAGLINES.has(tagline.toLowerCase())) return null;
  if (tagline === plan.name) return null;

  const price = planPrice(plan);
  if (tagline === price.amount) return null;

  return tagline;
}

export const PLANS_PAGE_SUBTITLE =
  'Manage the subscription for this listing — upgrade anytime as you grow.';

export type PlanFaqItem = {
  question: string;
  answer: string;
};

/** Host-facing billing FAQs — aligned with property-scoped PayMongo subscriptions. */
export const PLAN_FAQ_ITEMS: PlanFaqItem[] = [
  {
    question: 'Can I change my plan at any time?',
    answer:
      'Yes. Organization owners can switch this listing’s plan from the Plans page. Paid upgrades open PayMongo checkout and take effect once payment clears. Moving to Free applies immediately. Other downgrades use the same plan-selection flow.',
  },
  {
    question: 'Is pricing per property or per organization?',
    answer:
      'Per listing. Each property has its own subscription and billing history. If you manage multiple listings under one organization, each one is billed separately.',
  },
  {
    question: 'How does monthly billing work?',
    answer:
      'Paid plans renew every month. Before each renewal you’ll get a payment link by email and on the Billing tab. Pay with QRPH, Maya, or online banking through PayMongo — we never store card or bank details on Kame Homes.',
  },
  {
    question: 'What happens if I miss a renewal payment?',
    answer:
      'The listing becomes past due. You keep full dashboard access during the grace period. If payment is still missing after grace ends, access is limited to Plans and Help & Support until you pay. Guest forms and bookings for this listing keep working.',
  },
  {
    question: 'What happens when I downgrade?',
    answer:
      'Features above your new tier are turned off for this listing — team seats, marketing publishes, search placement, AI tools, and other limits follow the plan you’re on. Compare the tiers on the Compare tab before you move down.',
  },
  {
    question: 'How do AI credits work?',
    answer:
      'Higher tiers include a monthly AI credit allowance for tools like receipt validation, the dashboard assistant, and marketing generation. Your allowance updates when you change plans. Free and Starter do not include AI credits.',
  },
  {
    question: 'How do I get the Managed plan?',
    answer:
      'Managed is sales-assisted — choose Contact sales on the Managed card to open a Help & Support ticket. Our team will walk you through onboarding and pricing for hands-off hosting.',
  },
];

/** Shared section heading for Plans / Compare / Billing tab bodies. */
export const planTabSectionTitleClass =
  'text-foreground text-base font-semibold tracking-tight sm:text-lg';

type SubscriptionStatusMeta = {
  label: string;
  tone: 'success' | 'secondary' | 'destructive';
};

const SUBSCRIPTION_STATUS_META: Record<string, SubscriptionStatusMeta> = {
  active: { label: 'Active', tone: 'success' },
  trialing: { label: 'Trial', tone: 'secondary' },
  past_due: { label: 'Past due', tone: 'destructive' },
  suspended: { label: 'Suspended', tone: 'destructive' },
  canceled: { label: 'Cancelled', tone: 'secondary' },
};

export function subscriptionStatusMeta(status: string): SubscriptionStatusMeta {
  return SUBSCRIPTION_STATUS_META[status] ?? { label: status, tone: 'secondary' };
}

/** Deadline before a past-due subscription loses dashboard access. */
export function subscriptionGraceLabel(
  subscription: PropertySubscriptionDto | null
): string | null {
  if (!subscription?.gracePeriodEndsAt) return null;
  const formatted = formatManilaLongDate(subscription.gracePeriodEndsAt);
  if (!formatted || formatted === '—') return null;
  return formatted;
}

/** Renewal line for the current-plan panel — omitted entirely when the period is unset. */
export function subscriptionRenewalLabel(
  subscription: PropertySubscriptionDto | null
): string | null {
  if (!subscription?.currentPeriodEnd) return null;
  const formatted = formatManilaLongDate(subscription.currentPeriodEnd);
  if (!formatted || formatted === '—') return null;
  return formatted;
}

const QUICK_FACT_KEYS = [
  'teamManagement',
  'aiMonthlyCreditAllowance',
  'searchVisibilityTier',
] as const;

/**
 * Measured allowances on the active plan. Rows the plan does not include are dropped
 * rather than stacked up as "Not included" — the tier ladder below tells that story.
 */
export function planQuickFacts(features: PlanFeatures): { label: string; value: string }[] {
  return QUICK_FACT_KEYS.flatMap((key) => {
    const row = PLAN_FEATURE_ROWS.find((entry) => entry.key === key)!;
    const value = row.value(features);
    if (value.kind === 'off') return [];
    return [{ label: row.label, value: value.kind === 'text' ? value.text : 'Included' }];
  });
}
