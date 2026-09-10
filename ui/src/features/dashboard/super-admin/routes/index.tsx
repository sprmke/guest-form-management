import type { ReactNode } from 'react';

import { Navigate, Route, useParams } from 'react-router-dom';

import { SuperAdminHostShell } from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostShell';
import { SuperAdminOrgShell } from '@/features/dashboard/super-admin/components/super-admin-orgs/SuperAdminOrgShell';
import { SuperAdminShell } from '@/features/dashboard/super-admin/components/SuperAdminShell';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';
import { SuperAdminAiUsagePage } from '@/features/dashboard/super-admin/pages/SuperAdminAiUsagePage';
import { SuperAdminAnnouncementsPage } from '@/features/dashboard/super-admin/pages/SuperAdminAnnouncementsPage';
import { SuperAdminApprovalsPage } from '@/features/dashboard/super-admin/pages/SuperAdminApprovalsPage';
import { SuperAdminAuditPage } from '@/features/dashboard/super-admin/pages/SuperAdminAuditPage';
import { SuperAdminDevelopmentDetailPage } from '@/features/dashboard/super-admin/pages/SuperAdminDevelopmentDetailPage';
import { SuperAdminDevelopmentsPage } from '@/features/dashboard/super-admin/pages/SuperAdminDevelopmentsPage';
import { SuperAdminHelpFaqsPage } from '@/features/dashboard/super-admin/pages/SuperAdminHelpFaqsPage';
import { SuperAdminHostsPage } from '@/features/dashboard/super-admin/pages/SuperAdminHostsPage';
import { SuperAdminOrgsPage } from '@/features/dashboard/super-admin/pages/SuperAdminOrgsPage';
import { SuperAdminOrgSubscriptionsPage } from '@/features/dashboard/super-admin/pages/SuperAdminOrgSubscriptionsPage';
import { SuperAdminOverviewPage } from '@/features/dashboard/super-admin/pages/SuperAdminOverviewPage';
import { SuperAdminParkingPayoutsPage } from '@/features/dashboard/super-admin/pages/SuperAdminParkingPayoutsPage';
import { SuperAdminPaymentSettingsPage } from '@/features/dashboard/super-admin/pages/SuperAdminPaymentSettingsPage';
import { SuperAdminPlatformPropertiesPage } from '@/features/dashboard/super-admin/pages/SuperAdminPlatformPropertiesPage';
import { SuperAdminPlatformSettingsPage } from '@/features/dashboard/super-admin/pages/SuperAdminPlatformSettingsPage';
import { SuperAdminPlaybookArticlesPage } from '@/features/dashboard/super-admin/pages/SuperAdminPlaybookArticlesPage';
import { SuperAdminPricingPlansPage } from '@/features/dashboard/super-admin/pages/SuperAdminPricingPlansPage';
import { SuperAdminSettingsPage } from '@/features/dashboard/super-admin/pages/SuperAdminSettingsPage';
import { SuperAdminSupportPage } from '@/features/dashboard/super-admin/pages/SuperAdminSupportPage';

/** Any old sub-route under an org (`…/properties`, pre-overhaul `…/subscription`, etc.) now
 *  lands on the hub itself — sections are in-page anchors, not routes. */
function SuperAdminOrgLegacySubrouteRedirect() {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  return <Navigate to={superAdminPaths.organizationHub(orgSlug)} replace />;
}

/** Old `/orgs` and `/orgs/properties` sub-routes (pre-dropdown-filter redesign) now land on the
 *  host detail page itself — Organizations vs. Properties is a dropdown, not a route. */
function SuperAdminHostLegacySubrouteRedirect() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  return <Navigate to={superAdminPaths.hostDetail(hostId)} replace />;
}

export const superAdminRoutes: ReactNode = (
  <Route path="/admin" element={<SuperAdminShell />}>
    <Route index element={<SuperAdminOverviewPage />} />
    <Route path="developments" element={<SuperAdminDevelopmentsPage />} />
    <Route path="developments/:developmentSlug" element={<SuperAdminDevelopmentDetailPage />} />
    <Route path="approvals" element={<SuperAdminApprovalsPage />} />
    <Route path="support" element={<SuperAdminSupportPage />} />
    <Route path="support/faqs" element={<SuperAdminHelpFaqsPage />} />
    <Route path="playbook" element={<SuperAdminPlaybookArticlesPage />} />
    <Route path="announcements" element={<SuperAdminAnnouncementsPage />} />
    <Route path="hosts" element={<SuperAdminHostsPage />} />
    <Route path="settings" element={<SuperAdminSettingsPage />} />
    <Route path="ai-usage" element={<SuperAdminAiUsagePage />} />
    <Route path="audit" element={<SuperAdminAuditPage />} />
    <Route path="platform-settings" element={<SuperAdminPlatformSettingsPage />} />
    <Route path="pricing/plans" element={<SuperAdminPricingPlansPage />} />
    <Route path="pricing/payment-settings" element={<SuperAdminPaymentSettingsPage />} />
    <Route path="pricing/subscriptions" element={<SuperAdminOrgSubscriptionsPage />} />
    <Route path="parking/payouts" element={<SuperAdminParkingPayoutsPage />} />
    <Route path="properties" element={<SuperAdminPlatformPropertiesPage />} />
    <Route path="hosts/:hostId" element={<SuperAdminHostShell />} />
    <Route path="hosts/:hostId/*" element={<SuperAdminHostLegacySubrouteRedirect />} />
    <Route path="orgs" element={<SuperAdminOrgsPage />} />
    {/* Single-page hub — sections are in-page anchors (`#section-x`), not routes. */}
    <Route path="orgs/:orgSlug" element={<SuperAdminOrgShell />} />
    <Route path="orgs/:orgSlug/*" element={<SuperAdminOrgLegacySubrouteRedirect />} />
  </Route>
);
