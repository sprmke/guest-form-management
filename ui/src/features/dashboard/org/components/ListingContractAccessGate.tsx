import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { ListingVerificationModal } from '@/features/dashboard/org/components/listing-authorization/ListingVerificationModal';
import { RequireListingContractAccess } from '@/features/dashboard/org/components/RequireListingContractAccess';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import { emptyContractLegLifecycle } from '@/features/dashboard/org/lib/contractLifecycle';
import {
  readListingAuthorizationSummary,
  type ListingKind,
} from '@/features/dashboard/org/lib/listingAuthorization';

type Props = {
  listingKind: ListingKind;
  children: React.ReactNode;
};

/** Wraps listing shells with contract-expiry lock / grace banner from the listing row. */
export function ListingContractAccessGate({ listingKind, children }: Props) {
  const { orgSlug, parkingSlug } = useParams<{
    orgSlug: string;
    propertySlug?: string;
    parkingSlug?: string;
  }>();
  const orgsQuery = useOrganizations();
  const propertyCtx = useOptionalOrgContext();
  const parkingCtx = useOptionalParkingContext();
  const parkingsQuery = useParkings(listingKind === 'parking' ? orgSlug : undefined);
  const [renewOpen, setRenewOpen] = useState(false);

  const org =
    (listingKind === 'parking' ? parkingCtx?.org : propertyCtx?.org) ??
    orgsQuery.data?.organizations.find((entry) => entry.slug === orgSlug);

  const listing =
    listingKind === 'parking'
      ? (parkingCtx?.parking ??
        parkingsQuery.data?.parkings.find((entry) => entry.slug === parkingSlug))
      : propertyCtx?.property;

  if (!org || !listing) {
    return <>{children}</>;
  }

  const authorization = readListingAuthorizationSummary(listing.settings);
  const isOwner = org.accessKind === 'owner';

  return (
    <>
      <RequireListingContractAccess
        listingKind={listingKind}
        listingId={listing.id}
        orgId={org.id}
        contractEndYmd={authorization.contractEndDate}
        lifecycle={authorization.lifecycle ?? emptyContractLegLifecycle()}
        isOwner={isOwner}
        onRenewVerification={isOwner ? () => setRenewOpen(true) : undefined}
      >
        {children}
      </RequireListingContractAccess>
      {isOwner ? (
        <ListingVerificationModal
          open={renewOpen}
          onOpenChange={setRenewOpen}
          orgId={org.id}
          orgSlug={org.slug}
          listingKind={listingKind}
          listingId={listing.id}
          listingName={listing.name}
          listingSettings={listing.settings}
          isOwner={isOwner}
        />
      ) : null}
    </>
  );
}
