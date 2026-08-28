import { isHostVerificationHardRejected } from '@/features/dashboard/org/lib/orgVerificationTiers';
import { getLastOrgSlug, orgDashboardPath } from '@/features/dashboard/org/lib/tenantPaths';

export const HOST_VERIFICATION_REJECTED_PATH = '/verification-rejected';

type OrgLandingOrg = {
  slug: string;
  accessKind?: string;
  settings?: Record<string, unknown>;
  /** Seat paused by plan limits — listed for soft-allow gates, not a usable landing. */
  planLimited?: boolean;
};

function isHardRejectedOrg(org: OrgLandingOrg): boolean {
  return Boolean(org.settings && isHostVerificationHardRejected(org.settings));
}

function isAccessibleOrg(org: OrgLandingOrg): boolean {
  if (org.planLimited === true) return false;
  if (!org.settings) return true;
  return !isHostVerificationHardRejected(org.settings);
}

/**
 * Resolve where `/org` and similar hubs should send the user.
 * Prefer last-used org (localStorage) when still accessible; otherwise first accessible org.
 * All orgs hard-rejected → rejection screen. No usable orgs (none, or only plan-limited) → onboarding.
 */
export function resolveOrgLandingPath(organizations: readonly OrgLandingOrg[]): string {
  if (organizations.length === 0) {
    return '/onboarding';
  }

  const accessible = organizations.filter(isAccessibleOrg);
  if (accessible.length === 0) {
    if (organizations.every(isHardRejectedOrg)) {
      return HOST_VERIFICATION_REJECTED_PATH;
    }
    // Plan-limited-only (or mixed with rejected) — let the user start their own org.
    return '/onboarding';
  }

  const lastSlug = getLastOrgSlug();
  const org = accessible.find((entry) => entry.slug === lastSlug) ?? accessible[0]!;
  return orgDashboardPath(org.slug);
}

/**
 * True when the user already owns at least one organization that is still usable
 * (hard-rejected orgs do not block starting a new application).
 */
export function userOwnsOrganization(organizations: readonly OrgLandingOrg[]): boolean {
  return organizations.some((entry) => entry.accessKind === 'owner' && isAccessibleOrg(entry));
}
