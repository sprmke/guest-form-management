import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';

export type FeatureGateCopy = {
  title: string;
  description: string;
  ctaLabel: string;
};

export const FEATURE_GATE_COPY: Record<PlanFeatureKey, FeatureGateCopy> = {
  marketingStudio: {
    title: 'Template Management',
    description: 'Available on Starter and above.',
    ctaLabel: 'View plans',
  },
  marketingPublishLimitPerGroup: {
    title: 'Publish limit reached',
    description: 'Upgrade for more Marketing Studio publishes.',
    ctaLabel: 'View plans',
  },
  aiMarketingGeneration: {
    title: 'AI generation',
    description: 'Upgrade for more AI marketing credits.',
    ctaLabel: 'View plans',
  },
  aiMonthlyCreditAllowance: {
    title: 'AI credits',
    description: 'Upgrade for a higher monthly AI allowance.',
    ctaLabel: 'View plans',
  },
  aiDashboardAssistant: {
    title: 'AI dashboard assistant',
    description: 'Available on Business and above.',
    ctaLabel: 'View plans',
  },
  aiValidations: {
    title: 'AI receipt validation',
    description: 'Available on Business and above.',
    ctaLabel: 'View plans',
  },
  aiChatAutoReply: {
    title: 'AI auto-reply',
    description: 'Available on a paid plan.',
    ctaLabel: 'View plans',
  },
  aiReceptionist: {
    title: 'AI Receptionist',
    description: 'Available on a paid plan.',
    ctaLabel: 'View plans',
  },
  customPages: {
    title: 'Public property listing',
    description: 'Available on Starter and above.',
    ctaLabel: 'View plans',
  },
  telegramNotifications: {
    title: 'Telegram notifications',
    description: 'Available on a paid plan.',
    ctaLabel: 'View plans',
  },
  teamManagement: {
    title: 'Team members',
    description: 'Invite more team members on a higher plan.',
    ctaLabel: 'View plans',
  },
  automatedBookingFlow: {
    title: 'Automated document generation',
    description: 'Available on Starter and above.',
    ctaLabel: 'View plans',
  },
  verifiedBadgeEligible: {
    title: 'Verified badge',
    description: 'Available on Starter and above.',
    ctaLabel: 'View plans',
  },
  recommendedBadgeEligible: {
    title: 'Recommended badge',
    description: 'Available on Business and above.',
    ctaLabel: 'View plans',
  },
  searchVisibilityTier: {
    title: 'Search visibility',
    description: 'Upgrade for better listing placement.',
    ctaLabel: 'View plans',
  },
  fullyManagedByPlatform: {
    title: 'Full-service property management',
    description:
      'Contact us for hands-on operations, marketing, chat, and reminders — with full booking and finance visibility.',
    ctaLabel: 'View plans',
  },
};

export function featureGateCopy(feature: PlanFeatureKey): FeatureGateCopy {
  return FEATURE_GATE_COPY[feature];
}
