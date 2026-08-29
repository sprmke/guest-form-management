import { OrgPlansPage } from '@/features/dashboard/plans/pages/OrgPlansPage';

/**
 * Property-scoped Plans & Billing — same org subscription UI; PayMongo handoff goes to
 * org `/plans` only after **Continue to payment**.
 */
export function PropertyPlansPage() {
  return <OrgPlansPage paidCheckoutMode="redirect-to-org" />;
}
