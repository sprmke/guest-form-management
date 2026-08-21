import { useNavigate } from 'react-router-dom';

import { ChevronRight, Home } from 'lucide-react';

import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import { useOrgListingVerifications } from '@/features/dashboard/org/hooks/useListingAuthorization';
import type { OrgListingVerificationRollupRow } from '@/features/dashboard/org/lib/listingAuthorizationApi';
import { listingKindLabel } from '@/features/dashboard/org/lib/listingVerificationCopy';
import {
  parkingDashboardPath,
  propertyDashboardPath,
} from '@/features/dashboard/org/lib/tenantPaths';

import { ListRowsSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';

type Props = {
  orgId: string;
  orgSlug: string;
  enabled?: boolean;
  /** Hide Open links — e.g. super-admin org review context. */
  readOnly?: boolean;
};

function listingOpenPath(orgSlug: string, row: OrgListingVerificationRollupRow): string {
  const base =
    row.listingKind === 'parking'
      ? parkingDashboardPath(orgSlug, row.slug)
      : propertyDashboardPath(orgSlug, row.slug);
  return `${base}?listingVerification=open`;
}

export function OrgListingVerificationRollup({
  orgId,
  orgSlug,
  enabled = true,
  readOnly = false,
}: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useOrgListingVerifications(orgId, enabled);
  const listings = data?.listings ?? [];

  if (!enabled) return null;

  return (
    <section aria-labelledby="org-listing-verification-rollup-title" className="space-y-3">
      <div className="min-w-0 space-y-1">
        <h3
          id="org-listing-verification-rollup-title"
          className="text-foreground text-sm font-semibold leading-tight"
        >
          Listings
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {readOnly
            ? 'Per-listing authorization is reviewed as separate queue rows.'
            : 'Per-listing authorization status. Open a listing to submit or update its documents.'}
        </p>
      </div>

      {isLoading ? (
        <ListRowsSkeleton rows={3} label="Loading listings" />
      ) : listings.length === 0 ? (
        <p className="text-muted-foreground text-sm">No listings yet.</p>
      ) : (
        <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
          {listings.map((row) => {
            const missingCount = row.missingDocs.length;
            return (
              <li key={`${row.listingKind}-${row.listingId}`}>
                <div className="flex min-h-[44px] items-center gap-3 px-3 py-2.5 sm:px-4">
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Home className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-foreground truncate text-sm font-medium">{row.name}</p>
                      <span className="text-muted-foreground text-[11px]">
                        {listingKindLabel(row.listingKind)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <VerificationStatusBadge
                        status={row.baseStatus}
                        kind={row.baseRejectionKind}
                        showIcon
                      />
                      {row.recommendedStatus !== 'none' ? (
                        <VerificationStatusBadge
                          status={row.recommendedStatus}
                          kind={row.recommendedRejectionKind}
                          showIcon
                        />
                      ) : null}
                      {missingCount > 0 && row.baseStatus !== 'approved' ? (
                        <span className="text-muted-foreground text-[11px]">
                          {missingCount} missing
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px] shrink-0 gap-1 px-2.5 text-xs"
                      onClick={() => navigate(listingOpenPath(orgSlug, row))}
                    >
                      Open
                      <ChevronRight className="size-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
