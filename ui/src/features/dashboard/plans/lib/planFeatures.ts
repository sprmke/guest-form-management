/** Hand-mirror of supabase/functions/_shared/planFeatures.ts — keep in sync. */

export type SearchVisibilityTier = 'none' | 'top30' | 'top15' | 'top20' | 'top10';

export type PlanTeamManagement = {
  enabled: boolean;
  maxMembers: number | null;
};

export type PlanFeatures = {
  automatedBookingFlow: boolean;
  verifiedBadgeEligible: boolean;
  recommendedBadgeEligible: boolean;
  telegramNotifications: boolean;
  teamManagement: PlanTeamManagement;
  searchVisibilityTier: SearchVisibilityTier;
  marketingPublishLimitPerGroup: number | null;
  aiValidations: boolean;
  aiMonthlyCreditAllowance: number;
  marketingStudio: boolean;
  customPages: boolean;
  aiDashboardAssistant: boolean;
  aiReceptionist: boolean;
  aiMarketingGeneration: boolean;
  aiChatAutoReply: boolean;
  fullyManagedByPlatform: boolean;
};

export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  automatedBookingFlow: false,
  verifiedBadgeEligible: false,
  recommendedBadgeEligible: false,
  telegramNotifications: false,
  teamManagement: { enabled: false, maxMembers: null },
  searchVisibilityTier: 'none',
  marketingPublishLimitPerGroup: 0,
  aiValidations: false,
  aiMonthlyCreditAllowance: 0,
  marketingStudio: false,
  customPages: false,
  aiDashboardAssistant: false,
  aiReceptionist: false,
  aiMarketingGeneration: false,
  aiChatAutoReply: false,
  fullyManagedByPlatform: false,
};

export type PlanFeatureKey = keyof PlanFeatures;

export type PropertyEntitlements = PlanFeatures & {
  planId: string;
  planCode: string;
  planName: string;
  pricingModel: string;
  status: string;
  propertySubscriptionId: string;
};

export function isFeatureEnabled(features: PlanFeatures, key: PlanFeatureKey): boolean {
  const value = features[key];
  if (typeof value === 'boolean') return value;
  if (key === 'teamManagement') return features.teamManagement.enabled;
  if (key === 'searchVisibilityTier') return features.searchVisibilityTier !== 'none';
  if (key === 'marketingPublishLimitPerGroup') {
    return (
      features.marketingPublishLimitPerGroup === null || features.marketingPublishLimitPerGroup > 0
    );
  }
  if (key === 'aiMonthlyCreditAllowance') return features.aiMonthlyCreditAllowance > 0;
  return false;
}

export function countPropertyTeamSlotsUsed(
  members: Array<{ status?: string }>,
  invitations: unknown[]
): number {
  const activeMembers = members.filter((member) => member.status !== 'inactive').length;
  const firstInvitation = invitations[0];
  const pendingInvitations =
    firstInvitation &&
    typeof firstInvitation === 'object' &&
    firstInvitation !== null &&
    'status' in firstInvitation
      ? invitations.filter(
          (invitation) =>
            typeof invitation === 'object' &&
            invitation !== null &&
            (invitation as { status?: string }).status === 'pending'
        ).length
      : 0;
  return activeMembers + pendingInvitations;
}

export function canInviteTeamMember(
  entitlements: PlanFeatures | undefined,
  slotsUsed: number
): boolean {
  if (!entitlements?.teamManagement.enabled) return false;
  const max = entitlements.teamManagement.maxMembers;
  if (max === null) return true;
  return slotsUsed < max;
}

export const PLAN_FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  automatedBookingFlow: 'Automated document generation',
  verifiedBadgeEligible: 'Verified badge eligible',
  recommendedBadgeEligible: 'Recommended badge eligible',
  telegramNotifications: 'Telegram alerts',
  teamManagement: 'Team members',
  searchVisibilityTier: 'Search placement',
  marketingPublishLimitPerGroup: 'Marketing publishes',
  aiValidations: 'AI receipt and ID validation',
  aiMonthlyCreditAllowance: 'AI credits',
  marketingStudio: 'Template Management',
  customPages: 'Public property listing',
  aiDashboardAssistant: 'AI dashboard assistant',
  aiReceptionist: 'AI receptionist',
  aiMarketingGeneration: 'AI content generation',
  aiChatAutoReply: 'AI chat auto-reply',
  fullyManagedByPlatform: 'Full-service property management',
};
