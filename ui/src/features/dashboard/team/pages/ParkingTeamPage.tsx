import { useCallback, useMemo, useState } from 'react';

import { Mail, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { CustomRoleFormDialog } from '@/features/dashboard/team/components/CustomRoleFormDialog';
import { EditMemberContactDialog } from '@/features/dashboard/team/components/EditMemberContactDialog';
import {
  EditPermissionsDialog,
  permissionsForRole,
} from '@/features/dashboard/team/components/EditPermissionsDialog';
import {
  defaultInviteRoleId,
  InviteMemberDialog,
} from '@/features/dashboard/team/components/InviteMemberDialog';
import { RemoveMemberDialog } from '@/features/dashboard/team/components/RemoveMemberDialog';
import { TeamInvitationsTab } from '@/features/dashboard/team/components/TeamInvitationsTab';
import { TeamMembersTab } from '@/features/dashboard/team/components/TeamMembersTab';
import { TeamPermissionsTab } from '@/features/dashboard/team/components/TeamPermissionsTab';
import { TeamStatsCards } from '@/features/dashboard/team/components/TeamStatsCards';
import { useParkingPermissions } from '@/features/dashboard/team/hooks/useParkingPermissions';
import {
  useParkingTeam,
  useParkingTeamMutations,
} from '@/features/dashboard/team/hooks/useParkingTeam';
import { hasParkingPermission } from '@/features/dashboard/team/lib/parkingPermissions';
import { isTeamMemberActive } from '@/features/dashboard/team/lib/teamMemberAccess';
import { canEditPropertyMemberContact } from '@/features/dashboard/team/lib/teamMemberContact';
import { countMembersWithRole } from '@/features/dashboard/team/lib/teamRoleHelpers';
import { getTeamScopeConfig } from '@/features/dashboard/team/lib/teamScopeConfig';
import type {
  CustomPropertyRole,
  CustomRoleFormMode,
  PropertyRoleId,
  TeamMember,
  TeamTab,
} from '@/features/dashboard/team/types/propertyTeam';
import type { EditMemberContactSaveInput } from '@/features/dashboard/team/types/teamContact';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';
import { TooltipProvider } from '@/components/ui/tooltip';

function ParkingTeamPageSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl sm:h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function ParkingTeamPage() {
  const teamScope = 'parking' as const;
  const teamScopeConfig = getTeamScopeConfig(teamScope);
  const { data, isLoading, error } = useParkingTeam();
  const { data: access } = useParkingPermissions();
  const canViewTeam = hasParkingPermission(access?.permissions, 'team:view');
  const canInvite = hasParkingPermission(access?.permissions, 'team:invite');
  const canManage = hasParkingPermission(access?.permissions, 'team:manage');
  const {
    inviteMember,
    resendInvitation,
    cancelInvitation,
    updateMember,
    removeMember,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
  } = useParkingTeamMutations();

  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const customRoles = data?.customRoles ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedTab, setSelectedTab] = useState<TeamTab>('members');

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [showCustomRoleDialog, setShowCustomRoleDialog] = useState(false);
  const [customRoleFormMode, setCustomRoleFormMode] = useState<CustomRoleFormMode>('create');
  const [editingCustomRoleId, setEditingCustomRoleId] = useState<string | null>(null);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRolePermissions, setCustomRolePermissions] = useState<string[]>([]);

  const defaultRoleId = defaultInviteRoleId();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteContactPhone, setInviteContactPhone] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<PropertyRoleId>(defaultRoleId);

  const [editRoleId, setEditRoleId] = useState<PropertyRoleId>(defaultRoleId);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const memberCountByRole = useCallback(
    (roleId: string) => countMembersWithRole(roleId, members, invitations),
    [members, invitations]
  );

  const openInviteDialog = () => {
    const roleId = defaultInviteRoleId();
    setInviteEmail('');
    setInviteContactPhone('');
    setInviteRoleId(roleId);
    setShowInviteDialog(true);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;

    try {
      await inviteMember.mutateAsync({
        email,
        contactPhone: inviteContactPhone,
        roleId: inviteRoleId,
      });
      setShowInviteDialog(false);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleUpdateRole = async (memberId: string, newRoleId: PropertyRoleId) => {
    try {
      await updateMember.mutateAsync({ memberId, roleId: newRoleId });
      toast.success('Role updated');
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleToggleMemberStatus = async (member: TeamMember) => {
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        status: isTeamMemberActive(member) ? 'inactive' : 'active',
      });
      toast.success(isTeamMemberActive(member) ? 'Member deactivated' : 'Member activated');
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleEditContact = (member: TeamMember) => {
    setSelectedMember(member);
    setShowContactDialog(true);
  };

  const handleSaveContact = async (input: EditMemberContactSaveInput) => {
    if (!selectedMember) return;
    if (!canEditPropertyMemberContact(selectedMember, canManage)) return;

    try {
      await updateMember.mutateAsync({
        memberId: selectedMember.id,
        displayName: input.displayName,
        contactPhone: input.contactPhone,
        ...(input.roleId ? { roleId: input.roleId } : {}),
      });
      toast.success('Member updated');
      setShowContactDialog(false);
      setSelectedMember(null);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleEditPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setEditRoleId(member.role);
    setEditPermissions([...member.permissions]);
    setShowEditDialog(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    try {
      await updateMember.mutateAsync({
        memberId: selectedMember.id,
        roleId: editRoleId,
        permissions: editPermissions,
      });
      toast.success('Permissions saved');
      setShowEditDialog(false);
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

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId);
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
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

  const openEditCustomRole = (role: CustomPropertyRole) => {
    setCustomRoleFormMode('edit');
    setEditingCustomRoleId(role.id);
    setCustomRoleName(role.name);
    setCustomRolePermissions([...role.permissions]);
    setShowCustomRoleDialog(true);
  };

  const handleSaveCustomRole = async () => {
    const name = customRoleName.trim();
    if (!name || customRolePermissions.length === 0) return;

    try {
      if (customRoleFormMode === 'create') {
        await createCustomRole.mutateAsync({
          name,
          permissions: customRolePermissions,
        });
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

  const handleDeleteCustomRole = async (role: CustomPropertyRole) => {
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

  const toggleEditPermission = (permissionId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCustomRolePermission = (permissionId: string) => {
    setCustomRolePermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const customRoleCount = useMemo(() => customRoles.length, [customRoles]);

  const inviteAction = canInvite ? (
    <Button
      variant="outline"
      className="min-h-[44px] w-full sm:w-auto"
      onClick={openInviteDialog}
      disabled={isLoading || Boolean(error)}
    >
      <UserPlus className="mr-2 size-4" aria-hidden />
      Invite Member
    </Button>
  ) : undefined;

  const heroInviteAction = canInvite ? (
    <MobileHeroActionButton
      aria-label="Invite member"
      onClick={openInviteDialog}
      disabled={isLoading || Boolean(error)}
    >
      <UserPlus className="size-5" aria-hidden />
    </MobileHeroActionButton>
  ) : undefined;

  return (
    <TooltipProvider>
      <AdminMobilePage
        title="Team"
        subtitle={teamScopeConfig.subtitle}
        heroTrailing={heroInviteAction}
        desktopActions={inviteAction}
        desktopActionsClassName="w-full sm:w-auto"
      >
        {isLoading ? <ParkingTeamPageSkeleton /> : null}

        {error ? (
          <Card>
            <CardContent className="text-destructive py-8 text-center text-sm">
              {(error as Error).message}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error ? (
          <>
            <TeamStatsCards members={members} invitations={invitations} />

            <div className="space-y-3 sm:space-y-4">
              <SlidingTabs
                value={selectedTab}
                onValueChange={(value) => setSelectedTab(value as TeamTab)}
              >
                <SlidingTabsList
                  size="primary"
                  remeasureDeps={[
                    canInvite,
                    canViewTeam,
                    customRoleCount,
                    members.length,
                    invitations.length,
                  ]}
                >
                  <SlidingTabsTrigger value="members">
                    <Users className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Members</span>
                    <Badge variant="secondary" className="ml-1">
                      {members.length}
                    </Badge>
                  </SlidingTabsTrigger>
                  {canInvite ? (
                    <SlidingTabsTrigger value="invitations">
                      <Mail className="size-4" aria-hidden />
                      <span className="hidden sm:inline">Invitations</span>
                      {invitations.length > 0 ? (
                        <Badge variant="secondary" className="ml-1">
                          {invitations.length}
                        </Badge>
                      ) : null}
                    </SlidingTabsTrigger>
                  ) : null}
                  {canViewTeam ? (
                    <SlidingTabsTrigger value="permissions">
                      <Shield className="size-4" aria-hidden />
                      <span className="hidden sm:inline">Permissions</span>
                      {customRoleCount > 0 ? (
                        <Badge variant="secondary" className="ml-1">
                          +{customRoleCount}
                        </Badge>
                      ) : null}
                    </SlidingTabsTrigger>
                  ) : null}
                </SlidingTabsList>
              </SlidingTabs>

              {selectedTab === 'members' ? (
                <TeamMembersTab
                  scope={teamScope}
                  members={members}
                  customRoles={customRoles}
                  searchQuery={searchQuery}
                  filterRole={filterRole}
                  onSearchChange={setSearchQuery}
                  onFilterRoleChange={setFilterRole}
                  onRoleChange={handleUpdateRole}
                  onEditPermissions={handleEditPermissions}
                  onEditContact={handleEditContact}
                  onToggleStatus={handleToggleMemberStatus}
                  onRemove={(member) => {
                    setSelectedMember(member);
                    setShowRemoveDialog(true);
                  }}
                  onInvite={openInviteDialog}
                  canInvite={canInvite}
                  canManage={canManage}
                  onAddCustomRole={canManage ? openCreateCustomRole : undefined}
                />
              ) : null}

              {selectedTab === 'invitations' ? (
                <TeamInvitationsTab
                  scope={teamScope}
                  invitations={invitations}
                  customRoles={customRoles}
                  onCancel={handleCancelInvitation}
                  onResend={handleResendInvitation}
                  resendPending={resendInvitation.isPending}
                  cancelPending={cancelInvitation.isPending}
                  onInvite={openInviteDialog}
                  canInvite={canInvite}
                />
              ) : null}

              {selectedTab === 'permissions' ? (
                <TeamPermissionsTab
                  scope={teamScope}
                  customRoles={customRoles}
                  memberCountByRole={memberCountByRole}
                  onCreateCustomRole={openCreateCustomRole}
                  onEditCustomRole={openEditCustomRole}
                  onDeleteCustomRole={handleDeleteCustomRole}
                  canManage={canManage}
                />
              ) : null}
            </div>
          </>
        ) : null}

        <InviteMemberDialog
          scope={teamScope}
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          email={inviteEmail}
          contactPhone={inviteContactPhone}
          roleId={inviteRoleId}
          customRoles={customRoles}
          onEmailChange={setInviteEmail}
          onContactPhoneChange={setInviteContactPhone}
          onRoleChange={setInviteRoleId}
          onAddCustomRole={canManage ? openCreateCustomRole : undefined}
          showAddCustomRole={canManage}
          builtinRoles={teamScopeConfig.builtinRoles}
          onSubmit={handleInvite}
          submitPending={inviteMember.isPending}
        />

        <EditMemberContactDialog
          open={showContactDialog}
          member={selectedMember}
          roleConfig={
            selectedMember && !selectedMember.fromOrg
              ? {
                  scope: teamScope,
                  roleId: selectedMember.role,
                  customRoles,
                  editable: canManage,
                  onAddCustomRole: canManage ? openCreateCustomRole : undefined,
                }
              : null
          }
          onOpenChange={setShowContactDialog}
          onSave={handleSaveContact}
          savePending={updateMember.isPending}
        />

        <EditPermissionsDialog
          scope={teamScope}
          open={showEditDialog}
          member={selectedMember}
          roleId={editRoleId}
          customRoles={customRoles}
          permissions={editPermissions}
          onOpenChange={setShowEditDialog}
          onRoleChange={(roleId) => {
            setEditRoleId(roleId);
            setEditPermissions(permissionsForRole(teamScope, roleId, customRoles));
          }}
          onTogglePermission={toggleEditPermission}
          onSave={handleSavePermissions}
          onAddCustomRole={canManage ? openCreateCustomRole : undefined}
          showAddCustomRole={canManage}
          savePending={updateMember.isPending}
        />

        <RemoveMemberDialog
          open={showRemoveDialog}
          member={selectedMember}
          onOpenChange={setShowRemoveDialog}
          onConfirm={handleRemoveMember}
          confirmPending={removeMember.isPending}
        />

        <CustomRoleFormDialog
          scope={teamScope}
          open={showCustomRoleDialog}
          mode={customRoleFormMode}
          name={customRoleName}
          permissions={customRolePermissions}
          onOpenChange={setShowCustomRoleDialog}
          onNameChange={setCustomRoleName}
          onTogglePermission={toggleCustomRolePermission}
          onSubmit={handleSaveCustomRole}
          submitPending={createCustomRole.isPending || updateCustomRole.isPending}
        />
      </AdminMobilePage>
    </TooltipProvider>
  );
}
