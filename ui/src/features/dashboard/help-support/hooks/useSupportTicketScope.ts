import {
  useOrgIdParam,
  useOrgSlugParam,
  useParkingIdParam,
  usePropertyIdParam,
} from '@/features/dashboard/org/lib/adminApiScope';

import type { SupportTicketScopeParams } from '../lib/supportTicketApi';

/** Org/property/parking scope from whichever admin route Help & Support is mounted under. */
export function useSupportTicketScope(): SupportTicketScopeParams {
  return {
    orgSlug: useOrgSlugParam(),
    orgId: useOrgIdParam(),
    propertyId: usePropertyIdParam(),
    parkingId: useParkingIdParam(),
  };
}
