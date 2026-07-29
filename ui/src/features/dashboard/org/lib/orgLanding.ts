import { getLastOrgSlug, orgDashboardPath } from '@/features/dashboard/org/lib/tenantPaths';

type OrgLandingOrg = {
  slug: string;
  accessKind?: string;
};

/**
 * Resolve where `/org` and similar hubs should send the user.
 * Prefer last-used org (localStorage) when still accessible; otherwise first org.
 * No orgs → onboarding.
 */
export function resolveOrgLandingPath(organizations: readonly OrgLandingOrg[]): string {
  if (organizations.length === 0) {
    return '/onboarding';
  }

  const lastSlug = getLastOrgSlug();
  const org = organizations.find((entry) => entry.slug === lastSlug) ?? organizations[0]!;
  return orgDashboardPath(org.slug);
}

/** True when the user already owns at least one organization (cannot create another). */
export function userOwnsOrganization(organizations: readonly OrgLandingOrg[]): boolean {
  return organizations.some((entry) => entry.accessKind === 'owner');
}
