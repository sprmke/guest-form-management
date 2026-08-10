import { useParams } from 'react-router-dom';

import { RequireListingContractAccess } from '@/features/dashboard/org/components/RequireListingContractAccess';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import type { ContractLeg } from '@/features/dashboard/org/lib/contractLifecycle';
import { emptyContractLegLifecycle } from '@/features/dashboard/org/lib/contractLifecycle';
import { readOrgVerificationDetail } from '@/features/dashboard/org/lib/orgVerificationTiers';

type Props = {
  leg: ContractLeg;
  children: React.ReactNode;
};

/** Wraps listing shells with contract-expiry lock / grace banner. */
export function ListingContractAccessGate({ leg, children }: Props) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const orgsQuery = useOrganizations();

  const org = orgsQuery.data?.organizations.find((entry) => entry.slug === orgSlug);
  if (!org) {
    return <>{children}</>;
  }

  const detail = readOrgVerificationDetail(org.settings);
  const lifecycle = leg === 'parking' ? detail.parkingLifecycle : detail.propertyLifecycle;
  const contractEnd =
    leg === 'parking' ? detail.parkingContractEndDate : detail.propertyContractEndDate;

  return (
    <RequireListingContractAccess
      leg={leg}
      orgId={org.id}
      contractEndYmd={contractEnd}
      lifecycle={lifecycle ?? emptyContractLegLifecycle()}
      isOwner={org.accessKind === 'owner'}
    >
      {children}
    </RequireListingContractAccess>
  );
}
