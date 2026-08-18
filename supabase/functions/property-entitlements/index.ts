/**
 * property-entitlements — GET resolved plan features for a property (read-only).
 */

import { resolvePropertyEntitlements } from '../_shared/planEntitlements.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { readPropertyIdFromUrl, resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('property-entitlements', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const url = new URL(req.url);
  const propertyIdFromQuery = readPropertyIdFromUrl(url);
  const { property } = await resolveScopedPropertyAccess(req, 'settings:view', propertyIdFromQuery);
  const propertyId = property.id as string;

  const entitlements = await resolvePropertyEntitlements(propertyId);

  return jsonSuccess(req, {
    planId: entitlements.planId,
    planCode: entitlements.planCode,
    planName: entitlements.planName,
    pricingModel: entitlements.pricingModel,
    status: entitlements.status,
    propertySubscriptionId: entitlements.propertySubscriptionId,
    automatedBookingFlow: entitlements.automatedBookingFlow,
    verifiedBadgeEligible: entitlements.verifiedBadgeEligible,
    recommendedBadgeEligible: entitlements.recommendedBadgeEligible,
    telegramNotifications: entitlements.telegramNotifications,
    teamManagement: entitlements.teamManagement,
    searchVisibilityTier: entitlements.searchVisibilityTier,
    marketingPublishLimitPerGroup: entitlements.marketingPublishLimitPerGroup,
    aiValidations: entitlements.aiValidations,
    aiMonthlyCreditAllowance: entitlements.aiMonthlyCreditAllowance,
    marketingStudio: entitlements.marketingStudio,
    customPages: entitlements.customPages,
    aiDashboardAssistant: entitlements.aiDashboardAssistant,
    aiReceptionist: entitlements.aiReceptionist,
    aiMarketingGeneration: entitlements.aiMarketingGeneration,
    aiChatAutoReply: entitlements.aiChatAutoReply,
    fullyManagedByPlatform: entitlements.fullyManagedByPlatform,
  });
});
