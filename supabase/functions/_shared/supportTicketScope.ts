/**
 * Resolve the org/property/parking scope a support ticket was filed from.
 * Help & Support is visible to every team member (no dedicated permission gate),
 * mirroring the baseline access org/property/parking members already have for
 * Dashboard — see docs/workflow/in-progress/help-support-center.md "Nav + routing wiring".
 */

import {
  type AuthenticatedUser,
  type OrgRow,
  verifyOrgAccess,
  verifyParkingTeamAccess,
  verifyPropertyAccess,
} from './orgAuth.ts';

export type SupportTicketScope = {
  user: AuthenticatedUser;
  org: OrgRow;
  propertyId: string | null;
  propertyName: string | null;
  parkingId: string | null;
  parkingName: string | null;
};

export async function resolveSupportTicketScope(
  req: Request,
  scope: { orgSlug?: string | null; orgId?: string | null; propertyId?: string | null; parkingId?: string | null }
): Promise<SupportTicketScope> {
  if (scope.propertyId) {
    const access = await verifyPropertyAccess(req, scope.propertyId);
    return {
      user: access.user,
      org: access.org,
      propertyId: access.property.id,
      propertyName: access.property.name,
      parkingId: null,
      parkingName: null,
    };
  }

  if (scope.parkingId) {
    const access = await verifyParkingTeamAccess(req, scope.parkingId);
    return {
      user: access.user,
      org: access.org,
      propertyId: null,
      propertyName: null,
      parkingId: access.parking.id,
      parkingName: access.parking.name,
    };
  }

  const orgAccess = await verifyOrgAccess(req, {
    orgSlug: scope.orgSlug ?? undefined,
    orgId: scope.orgId ?? undefined,
  });
  return {
    user: orgAccess.user,
    org: orgAccess.org,
    propertyId: null,
    propertyName: null,
    parkingId: null,
    parkingName: null,
  };
}
