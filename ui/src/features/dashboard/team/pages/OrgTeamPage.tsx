import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { Mail, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { TeamInviteTierBadgeAnchor } from '@/features/dashboard/plans/components/TierBadge';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { CustomRoleFormDialog } from '@/features/dashboard/team/components/CustomRoleFormDialog';
import {
  defaultOrgInviteForm,
  OrgInviteMemberDialog,
  type OrgInviteFormState,
} from '@/features/dashboard/team/components/OrgInviteMemberDialog';
import { OrgManageMemberDialog } from '@/features/dashboard/team/components/OrgManageMemberDialog';
import { OrgTeamInvitationsTab } from '@/features/dashboard/team/components/OrgTeamInvitationsTab';
import { OrgTeamMembersTab } from '@/features/dashboard/team/components/OrgTeamMembersTab';
import { OrgTeamPermissionsTab } from '@/features/dashboard/team/components/OrgTeamPermissionsTab';
import { OrgTeamStatsCards } from '@/features/dashboard/team/components/OrgTeamStatsCards';
import { RemoveMemberDialog } from '@/features/dashboard/team/components/RemoveMemberDialog';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { useOrgTeam, useOrgTeamMutations } from '@/features/dashboard/team/hooks/useOrgTeam';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';
import { countOrgMembersWithTemplateRole } from '@/features/dashboard/team/lib/orgTeamRoles';
import type {
  CustomOrgRole,
  OrgTeamMember,
  OrgTeamTab,
} from '@/features/dashboard/team/types/orgTeam';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { TeamPageSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';

export function OrgTeamPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgAccess, isLoading: orgAccessLoading } = useOrgPermissions();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const orgFromList = orgsData?.organizations.find((entry) => entry.slug === orgSlug);
  const orgId = orgAccess?.orgId ?? orgFromList?.id ?? null;

  const { data, isLoading, error } = useOrgTeam(orgId);
  const {
    inviteMember,
    resendInvitation,
    cancelInvitation,
    updateMember,
    removeMember,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
  } = useOrgTeamMutations(orgId);

  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const customRoles = data?.customRoles ?? [];

  const canManage = hasOrgPermission(orgAccess?.permissions, 'org.team.members:edit');
  const canManageRoles = hasOrgPermission(orgAccess?.permissions, 'org.team.roles:edit');
  const canInvite = hasOrgPermission(orgAccess?.permissions, 'org.team.invitations:add');
  useFeatureGate('teamManagement');
  const { open: openUpgradeModal } = useUpgradeModal();
  const canInviteByPlan = data?.teamInviteCapacity?.canInvite ?? false;
  const teamInviteCapacityKnown = data?.teamInviteCapacity?.canInvite;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedTab, setSelectedTab] = useState<OrgTeamTab>('members');

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState<OrgInviteFormState>(() =>
    defaultOrgInviteForm(customRoles)
  );
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgTeamMember | null>(null);

  const [showCustomRoleDialog, setShowCustomRoleDialog] = useState(false);
  const [customRoleFormMode, setCustomRoleFormMode] = useState<'create' | 'edit'>('create');
  const [editingCustomRoleId, setEditingCustomRoleId] = useState<string | null>(null);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRolePermissions, setCustomRolePermissions] = useState<string[]>([]);

  const memberCountByRole = (roleId: string) =>
    countOrgMembersWithTemplateRole(roleId, members, invitations);

  const openInviteDialog = () => {
    if (!canInviteByPlan) {
      openUpgradeModal('teamManagement');
      return;
    }
    setInviteForm(defaultOrgInviteForm(customRoles));
    setShowInviteDialog(true);
  };

  const handleInvite = async () => {
    if (!canInviteByPlan) {
      openUpgradeModal('teamManagement');
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email: inviteForm.email.trim(),
        contactPhone: inviteForm.contactPhone,
        roleId: inviteForm.roleId,
        permissions: inviteForm.permissions,
        allListings: inviteForm.allListings,
        listingAssignments: inviteForm.listingAssignments,
      });
      setShowInviteDialog(false);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleToggleMemberStatus = async (member: OrgTeamMember) => {
    if (member.status === 'inactive' && member.planLimited && !canInviteByPlan) {
      openUpgradeModal('teamManagement');
      return;
    }

    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        status: member.status === 'active' ? 'inactive' : 'active',
      });
      toast.success(member.status === 'active' ? 'Member deactivated' : 'Member activated');
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleManageMember = (member: OrgTeamMember) => {
    setSelectedMember(member);
    setShowManageDialog(true);
  };

  const handleSaveManageMember = async (input: {
    memberId: string;
    displayName: string;
    contactPhone: string;
    roleId: string;
    permissions: string[];
    allListings: boolean;
    listingAssignments: OrgInviteFormState['listingAssignments'];
  }) => {
    try {
      await updateMember.mutateAsync(input);
      toast.success('Member updated');
      setShowManageDialog(false);
      setSelectedMember(null);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    try {
      await removeMember.mutateAsync(selectedMember.id);
      setShowRemoveDialog(false);
      setSelectedMember(null);
    } catch {
      /* toast handled in mutation */
    }
  };

  const openCreateCustomRole = () => {
    setCustomRoleFormMode('create');
    setEditingCustomRoleId(null);
    setCustomRoleName('');
    setCustomRolePermissions([]);
    setShowCustomRoleDialog(true);
  };

  const openEditCustomRole = (role: CustomOrgRole) => {
    setCustomRoleFormMode('edit');
    setEditingCustomRoleId(role.id);
    setCustomRoleName(role.name);
    setCustomRolePermissions([...role.permissions]);
    setShowCustomRoleDialog(true);
  };

  const openDuplicateCustomRole = (role: CustomOrgRole) => {
    setCustomRoleFormMode('create');
    setEditingCustomRoleId(null);
    setCustomRoleName(`${role.name} copy`);
    setCustomRolePermissions([...role.permissions]);
    setShowCustomRoleDialog(true);
  };

  const handleSaveCustomRole = async () => {
    const name = customRoleName.trim();
    if (!name || customRolePermissions.length === 0) return;

    try {
      if (customRoleFormMode === 'create') {
        await createCustomRole.mutateAsync({ name, permissions: customRolePermissions });
      } else if (editingCustomRoleId) {
        await updateCustomRole.mutateAsync({
          roleId: editingCustomRoleId,
          name,
          permissions: customRolePermissions,
        });
      }
      setShowCustomRoleDialog(false);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleDeleteCustomRole = async (role: CustomOrgRole) => {
    if (memberCountByRole(role.id) > 0) {
      toast.error('Remove members from this role before deleting');
      return;
    }
    try {
      await deleteCustomRole.mutateAsync(role.id);
    } catch {
      /* toast handled in mutation */
    }
  };

  const pageLoading = isLoading || orgAccessLoading || (!orgId && orgsLoading);
  const showTeamContent = Boolean(!pageLoading && !error && orgId && data);

  const inviteAction = canInvite ? (
    <TeamInviteTierBadgeAnchor canInvite={teamInviteCapacityKnown} className="w-full sm:w-auto">
      <Button
        variant="outline"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={openInviteDialog}
        disabled={pageLoading || Boolean(error) || !orgSlug}
        aria-disabled={!canInviteByPlan || undefined}
      >
        <UserPlus className="mr-2 size-4" aria-hidden />
        Invite Member
      </Button>
    </TeamInviteTierBadgeAnchor>
  ) : undefined;

  const heroInviteAction = canInvite ? (
    <TeamInviteTierBadgeAnchor canInvite={teamInviteCapacityKnown}>
      <MobileHeroActionButton
        aria-label="Invite member"
        onClick={openInviteDialog}
        disabled={pageLoading || Boolean(error) || !orgSlug}
      >
        <UserPlus className="size-5" aria-hidden />
      </MobileHeroActionButton>
    </TeamInviteTierBadgeAnchor>
  ) : undefined;

  return (
    <RequireAdmin>
      <AdminMobilePage
        title="Team"
        subtitle="Manage your organization's team members and permissions."
        heroTrailing={heroInviteAction}
        desktopActions={inviteAction}
        desktopActionsClassName="w-full sm:w-auto"
      >
        {pageLoading ? <TeamPageSkeleton /> : null}

        {error ? (
          <Card>
            <CardContent className="text-destructive py-8 text-center text-sm">
              {(error as Error).message?.trim() || 'Failed to load team members.'}
            </CardContent>
          </Card>
        ) : null}

        {!pageLoading && !error && orgSlug && !orgId ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Organization not found.
            </CardContent>
          </Card>
        ) : null}

        {showTeamContent ? (
          <>
            <OrgTeamStatsCards members={members} invitations={invitations} />

            <div className="space-y-3 sm:space-y-4">
              <SlidingTabs
                value={selectedTab}
                onValueChange={(value) => setSelectedTab(value as OrgTeamTab)}
              >
                <SlidingTabsList
                  size="primary"
                  remeasureDeps={[members.length, invitations.length, customRoles.length]}
                >
                  <SlidingTabsTrigger value="members">
                    <Users className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Members</span>
                    <Badge variant="secondary" className="ml-1">
                      {members.length}
                    </Badge>
                  </SlidingTabsTrigger>
                  <SlidingTabsTrigger value="invitations">
                    <Mail className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Invitations</span>
                    {invitations.length > 0 ? (
                      <Badge variant="secondary" className="ml-1">
                        {invitations.length}
                      </Badge>
                    ) : null}
                  </SlidingTabsTrigger>
                  <SlidingTabsTrigger value="permissions">
                    <Shield className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Permissions</span>
                  </SlidingTabsTrigger>
                </SlidingTabsList>
              </SlidingTabs>

              {selectedTab === 'members' ? (
                <OrgTeamMembersTab
                  members={members}
                  customRoles={customRoles}
                  searchQuery={searchQuery}
                  filterRole={filterRole}
                  onSearchChange={setSearchQuery}
                  onFilterRoleChange={setFilterRole}
                  onToggleStatus={handleToggleMemberStatus}
                  onEditContact={handleManageMember}
                  onRemove={(member) => {
                    setSelectedMember(member);
                    setShowRemoveDialog(true);
                  }}
                  onInvite={openInviteDialog}
                  canInvite={canInvite}
                  canManage={canManage}
                />
              ) : null}

              {selectedTab === 'invitations' ? (
                <OrgTeamInvitationsTab
                  invitations={invitations}
                  onCancel={(id) => void cancelInvitation.mutateAsync(id)}
                  onResend={(id) => void resendInvitation.mutateAsync(id)}
                  onInvite={openInviteDialog}
                  resendPending={resendInvitation.isPending}
                  cancelPending={cancelInvitation.isPending}
                  canInvite={canInvite}
                  canManage={canManage}
                />
              ) : null}

              {selectedTab === 'permissions' ? (
                <OrgTeamPermissionsTab
                  customRoles={customRoles}
                  members={members}
                  invitations={invitations}
                  onCreateCustomRole={openCreateCustomRole}
                  onEditCustomRole={openEditCustomRole}
                  onDeleteCustomRole={handleDeleteCustomRole}
                  onDuplicateCustomRole={openDuplicateCustomRole}
                  canManage={canManageRoles}
                />
              ) : null}
            </div>
          </>
        ) : null}

        {orgSlug ? (
          <OrgInviteMemberDialog
            open={showInviteDialog}
            orgSlug={orgSlug}
            customRoles={customRoles}
            onOpenChange={setShowInviteDialog}
            form={inviteForm}
            onFormChange={(patch) => setInviteForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleInvite}
            submitPending={inviteMember.isPending}
            onAddCustomRole={canManageRoles ? openCreateCustomRole : undefined}
            showAddCustomRole={canManageRoles}
          />
        ) : null}

        <OrgManageMemberDialog
          open={showManageDialog}
          orgSlug={orgSlug ?? ''}
          member={selectedMember}
          customRoles={customRoles}
          onOpenChange={setShowManageDialog}
          onSave={handleSaveManageMember}
          savePending={updateMember.isPending}
          onAddCustomRole={canManageRoles ? openCreateCustomRole : undefined}
          showAddCustomRole={canManageRoles}
        />

        <CustomRoleFormDialog
          scope="org"
          open={showCustomRoleDialog}
          mode={customRoleFormMode}
          name={customRoleName}
          permissions={customRolePermissions}
          roles={customRoles}
          onOpenChange={setShowCustomRoleDialog}
          onNameChange={setCustomRoleName}
          onTogglePermission={(permissionId) =>
            setCustomRolePermissions((prev) =>
              prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
            )
          }
          onPermissionsChange={setCustomRolePermissions}
          onSubmit={handleSaveCustomRole}
          submitPending={createCustomRole.isPending || updateCustomRole.isPending}
        />

        <RemoveMemberDialog
          open={showRemoveDialog}
          member={
            selectedMember
              ? {
                  id: selectedMember.id,
                  name: selectedMember.name,
                  email: selectedMember.email,
                  avatar: selectedMember.avatar,
                  displayName: selectedMember.displayName,
                  contactPhone: selectedMember.contactPhone,
                  role: selectedMember.role,
                  permissions: selectedMember.permissions,
                  status: selectedMember.status,
                  planLimited: selectedMember.planLimited,
                  assignedAt: selectedMember.assignedAt,
                  lastActive: selectedMember.lastActive,
                  assignedBy: selectedMember.assignedBy,
                  fromOrg: false,
                }
              : null
          }
          onOpenChange={setShowRemoveDialog}
          onConfirm={handleRemoveMember}
          confirmPending={removeMember.isPending}
          scopeLabel="this organization"
          confirmLabel="Remove from Organization"
        />
      </AdminMobilePage>
    </RequireAdmin>
  );
}
