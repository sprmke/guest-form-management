import type { ComponentType } from 'react';

import {
  Building2,
  ClipboardCheck,
  CreditCard,
  HelpCircle,
  Landmark,
  LifeBuoy,
  Sparkles,
  Users,
} from 'lucide-react';

import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

export type SuperAdminPlatformNavItem = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
};

/**
 * Destinations shown on the Super Admin overview grid and in the Platform
 * sidebar (excluding Overview itself). Keep this list as the single source
 * so the two surfaces cannot drift.
 */
export const SUPER_ADMIN_PLATFORM_DESTINATIONS: SuperAdminPlatformNavItem[] = [
  { label: 'Developments', href: superAdminPaths.developments, Icon: Landmark },
  { label: 'Properties', href: superAdminPaths.properties, Icon: Building2 },
  { label: 'Approvals', href: superAdminPaths.approvals, Icon: ClipboardCheck },
  { label: 'Hosts', href: superAdminPaths.hosts, Icon: Users },
  { label: 'Pricing plans', href: superAdminPaths.pricingPlans, Icon: CreditCard },
  {
    label: 'Payment settings',
    href: superAdminPaths.pricingPaymentSettings,
    Icon: CreditCard,
  },
  {
    label: 'Property subscriptions',
    href: superAdminPaths.propertySubscriptions,
    Icon: CreditCard,
  },
  { label: 'Support tickets', href: superAdminPaths.support, Icon: LifeBuoy },
  { label: 'FAQs', href: superAdminPaths.supportFaqs, Icon: HelpCircle },
  { label: 'AI Management', href: superAdminPaths.settings, Icon: Sparkles },
];
