import { InboxPage } from '@/features/dashboard/inbox/pages/InboxPage';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertyInboxPath } from '@/features/dashboard/org/lib/tenantPaths';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

export function PropertyInboxPage() {
  const orgContext = useOptionalOrgContext();
  const { data: access } = usePropertyPermissions();

  const orgSlug = orgContext?.orgSlug ?? null;
  const orgId = orgContext?.org.id ?? null;
  const propertyId = orgContext?.property.id ?? null;

  return (
    <InboxPage
      kind="property"
      returnPath={
        orgSlug && orgContext?.propertySlug
          ? propertyInboxPath(orgSlug, orgContext.propertySlug)
          : '/inbox'
      }
      canReply={hasPropertyPermission(access?.permissions, 'inbox:reply')}
      canManage={hasPropertyPermission(access?.permissions, 'inbox:manage')}
      showOrgManageTabs={false}
      scope={propertyId ? { propertyId } : null}
      orgSlug={orgSlug}
      orgId={orgId}
    />
  );
}
