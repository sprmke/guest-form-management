import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import { SuperAdminHostShell } from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostShell';
import { SuperAdminShell } from '@/features/dashboard/super-admin/components/SuperAdminShell';
import { SuperAdminApprovalsPage } from '@/features/dashboard/super-admin/pages/SuperAdminApprovalsPage';
import { SuperAdminDevelopmentDetailPage } from '@/features/dashboard/super-admin/pages/SuperAdminDevelopmentDetailPage';
import { SuperAdminDevelopmentsPage } from '@/features/dashboard/super-admin/pages/SuperAdminDevelopmentsPage';
import { SuperAdminHelpFaqsPage } from '@/features/dashboard/super-admin/pages/SuperAdminHelpFaqsPage';
import { SuperAdminHostOrgsPage } from '@/features/dashboard/super-admin/pages/SuperAdminHostOrgsPage';
import { SuperAdminHostPropertiesPage } from '@/features/dashboard/super-admin/pages/SuperAdminHostPropertiesPage';
import { SuperAdminHostsPage } from '@/features/dashboard/super-admin/pages/SuperAdminHostsPage';
import { SuperAdminOverviewPage } from '@/features/dashboard/super-admin/pages/SuperAdminOverviewPage';
import { SuperAdminPlatformPropertiesPage } from '@/features/dashboard/super-admin/pages/SuperAdminPlatformPropertiesPage';
import { SuperAdminPaymentSettingsPage } from '@/features/dashboard/super-admin/pages/SuperAdminPaymentSettingsPage';
import { SuperAdminPricingPlansPage } from '@/features/dashboard/super-admin/pages/SuperAdminPricingPlansPage';
import { SuperAdminPropertySubscriptionsPage } from '@/features/dashboard/super-admin/pages/SuperAdminPropertySubscriptionsPage';
import { SuperAdminPropertiesPage } from '@/features/dashboard/super-admin/pages/SuperAdminPropertiesPage';
import { SuperAdminSettingsPage } from '@/features/dashboard/super-admin/pages/SuperAdminSettingsPage';
import { SuperAdminSupportPage } from '@/features/dashboard/super-admin/pages/SuperAdminSupportPage';

export const superAdminRoutes: ReactNode = (
  <Route path="/admin" element={<SuperAdminShell />}>
    <Route index element={<SuperAdminOverviewPage />} />
    <Route path="developments" element={<SuperAdminDevelopmentsPage />} />
    <Route path="developments/:developmentSlug" element={<SuperAdminDevelopmentDetailPage />} />
    <Route path="approvals" element={<SuperAdminApprovalsPage />} />
    <Route path="support" element={<SuperAdminSupportPage />} />
    <Route path="support/faqs" element={<SuperAdminHelpFaqsPage />} />
    <Route path="hosts" element={<SuperAdminHostsPage />} />
    <Route path="settings" element={<SuperAdminSettingsPage />} />
    <Route path="pricing/plans" element={<SuperAdminPricingPlansPage />} />
    <Route path="pricing/payment-settings" element={<SuperAdminPaymentSettingsPage />} />
    <Route path="pricing/subscriptions" element={<SuperAdminPropertySubscriptionsPage />} />
    <Route path="properties" element={<SuperAdminPlatformPropertiesPage />} />
    <Route path="hosts/:hostId" element={<SuperAdminHostShell />}>
      <Route index element={<Navigate to="orgs" replace />} />
      <Route path="orgs" element={<SuperAdminHostOrgsPage />} />
      <Route path="orgs/properties" element={<SuperAdminHostPropertiesPage />} />
    </Route>
    <Route path="orgs/:orgSlug/properties" element={<SuperAdminPropertiesPage />} />
  </Route>
);
