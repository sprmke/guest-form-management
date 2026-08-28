import { useSupportTicketScopeOverride } from '@/features/dashboard/help-support/context/SupportTicketScopeContext';
import {
  useOrgIdParam,
  useOrgSlugParam,
  useParkingIdParam,
  usePropertyIdParam,
} from '@/features/dashboard/org/lib/adminApiScope';

import type { SupportTicketScopeParams } from '../lib/supportTicketApi';

/** Org/property/parking scope from admin routes or an explicit provider override. */
export function useSupportTicketScope(): SupportTicketScopeParams {
  const override = useSupportTicketScopeOverride();
  const routeScope: SupportTicketScopeParams = {
    orgSlug: useOrgSlugParam(),
    orgId: useOrgIdParam(),
    propertyId: usePropertyIdParam(),
    parkingId: useParkingIdParam(),
  };

  if (!override) return routeScope;

  return {
    orgSlug: override.orgSlug ?? routeScope.orgSlug,
    orgId: override.orgId ?? routeScope.orgId,
    propertyId: override.propertyId ?? routeScope.propertyId,
    parkingId: override.parkingId ?? routeScope.parkingId,
  };
}
