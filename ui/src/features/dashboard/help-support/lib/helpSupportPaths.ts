import { useParams } from 'react-router-dom';

import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';

/**
 * Base `/help-support` path for whichever admin scope the page is mounted under
 * (org, property, or parking). Route registration itself is Phase 6 — see
 * docs/workflow/in-progress/help-support-center.md "Nav + routing wiring".
 */
export function useHelpSupportBasePath(): string | null {
  const { orgSlug: routeOrgSlug } = useParams<{ orgSlug?: string }>();
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  const orgSlug = orgContext?.orgSlug ?? parkingContext?.orgSlug ?? routeOrgSlug ?? null;
  if (!orgSlug) return null;

  if (parkingContext) return `/org/${orgSlug}/parking/${parkingContext.parkingSlug}/help-support`;
  if (orgContext) return `/org/${orgSlug}/property/${orgContext.propertySlug}/help-support`;
  return `/org/${orgSlug}/help-support`;
}

export function helpSupportDocsPath(basePath: string): string {
  return `${basePath}/docs`;
}

export function helpSupportTicketsPath(basePath: string): string {
  return `${basePath}/tickets`;
}

export function helpSupportNewTicketPath(basePath: string): string {
  return `${basePath}/tickets/new`;
}

export function helpSupportTicketDetailPath(basePath: string, ticketId: string): string {
  return `${basePath}/tickets/${ticketId}`;
}

export type HelpSupportSection = 'faqs' | 'guides' | 'tickets';

export function helpSupportSectionFromPath(pathname: string): HelpSupportSection {
  if (pathname.includes('/help-support/tickets')) return 'tickets';
  if (pathname.includes('/help-support/docs')) return 'guides';
  return 'faqs';
}
