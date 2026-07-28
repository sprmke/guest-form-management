import type { AuthAudience } from '@/features/guest/auth/config/auth-page-config';
import { HOST_LOGIN_PATH } from '@/features/guest/auth/lib/hostAuthPaths';

import { getLastOrgSlug, orgDashboardPath } from '@/features/dashboard/org/lib/tenantPaths';

/** Derive host vs guest (Explore) mode from the current pathname. */
export function getAuthAudienceFromPath(pathname: string): AuthAudience {
  return pathname.startsWith('/for-hosts') ? 'host' : 'guest';
}

/** Login page for hosts. Guests use the checkout auth modal — no dedicated login route. */
export function getLoginHref(audience: AuthAudience): string | null {
  return audience === 'host' ? HOST_LOGIN_PATH : null;
}

/** Login href for the current marketing route (host landing vs explore). */
export function getLoginHrefFromPath(pathname: string): string | null {
  return getLoginHref(getAuthAudienceFromPath(pathname));
}

/** Host marketing nav CTA — Sign In when signed out, Dashboard when session exists. */
export function getHostMarketingNavCta(isSignedIn: boolean): { label: string; href: string } {
  if (isSignedIn) {
    const orgSlug = getLastOrgSlug();
    return {
      label: 'Dashboard',
      href: orgSlug ? orgDashboardPath(orgSlug) : '/dashboard',
    };
  }

  return {
    label: 'Sign In',
    href: HOST_LOGIN_PATH,
  };
}
