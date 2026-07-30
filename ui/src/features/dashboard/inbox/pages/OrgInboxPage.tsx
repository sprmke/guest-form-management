import { useParams } from 'react-router-dom';

import { InboxPage } from '@/features/dashboard/inbox/pages/InboxPage';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { orgInboxPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';

export function OrgInboxPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgAccess } = useOrgPermissions();
  const { data: orgsData } = useOrganizations();
  const orgFromList = orgsData?.organizations.find((o) => o.slug === orgSlug);
  const orgId = orgAccess?.orgId ?? orgFromList?.id ?? null;

  return (
    <InboxPage
      kind="org"
      returnPath={orgSlug ? orgInboxPath(orgSlug) : '/inbox'}
      canReply={hasOrgPermission(orgAccess?.permissions, 'org:inbox:reply')}
      canManage={hasOrgPermission(orgAccess?.permissions, 'org:inbox:manage')}
      showOrgManageTabs
      scope={null}
      orgSlug={orgSlug ?? null}
      orgId={orgId}
    />
  );
}
