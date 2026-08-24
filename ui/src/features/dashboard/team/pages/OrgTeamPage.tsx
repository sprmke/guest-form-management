import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { Mail, Shield, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { EditMemberContactDialog } from '@/features/dashboard/team/components/EditMemberContactDialog';
import {
  defaultOrgInviteRoleId,
  OrgInviteMemberDialog,
} from '@/features/dashboard/team/components/OrgInviteMemberDialog';
import { OrgTeamInvitationsTab } from '@/features/dashboard/team/components/OrgTeamInvitationsTab';
import { OrgTeamMembersTab } from '@/features/dashboard/team/components/OrgTeamMembersTab';
import { OrgTeamPermissionsTab } from '@/features/dashboard/team/components/OrgTeamPermissionsTab';
import { OrgTeamStatsCards } from '@/features/dashboard/team/components/OrgTeamStatsCards';
import { RemoveMemberDialog } from '@/features/dashboard/team/components/RemoveMemberDialog';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { useOrgTeam, useOrgTeamMutations } from '@/features/dashboard/team/hooks/useOrgTeam';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';
import type { OrgRoleId, OrgTeamMember, OrgTeamTab } from '@/features/dashboard/team/types/orgTeam';
import type { EditMemberContactSaveInput } from '@/features/dashboard/team/types/teamContact';

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
  const { inviteMember, resendInvitation, cancelInvitation, updateMember, removeMember } =
    useOrgTeamMutations(orgId);

  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const canManage = hasOrgPermission(orgAccess?.permissions, 'org:team:manage');
  const canInvite = hasOrgPermission(orgAccess?.permissions, 'org:team:invite');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedTab, setSelectedTab] = useState<OrgTeamTab>('members');

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgTeamMember | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteContactPhone, setInviteContactPhone] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<OrgRoleId>(defaultOrgInviteRoleId());

  const openInviteDialog = () => {
    setInviteEmail('');
    setInviteContactPhone('');
    setInviteRoleId(defaultOrgInviteRoleId());
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

  const handleToggleMemberStatus = async (member: OrgTeamMember) => {
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

  const handleEditContact = (member: OrgTeamMember) => {
    setSelectedMember(member);
    setShowContactDialog(true);
  };

  const handleSaveContact = async (input: EditMemberContactSaveInput) => {
    if (!selectedMember) return;
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

  const pageLoading = isLoading || orgAccessLoading || (!orgId && orgsLoading);

  const inviteAction = canInvite ? (
    <Button
      variant="outline"
      className="min-h-[44px] w-full sm:w-auto"
      onClick={openInviteDialog}
      disabled={pageLoading || Boolean(error) || !orgSlug}
    >
      <UserPlus className="mr-2 size-4" aria-hidden />
      Invite Member
    </Button>
  ) : undefined;

  const heroInviteAction = canInvite ? (
    <MobileHeroActionButton
      aria-label="Invite member"
      onClick={openInviteDialog}
      disabled={pageLoading || Boolean(error) || !orgSlug}
    >
      <UserPlus className="size-5" aria-hidden />
    </MobileHeroActionButton>
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
              {(error as Error).message}
            </CardContent>
          </Card>
        ) : null}

        {!pageLoading && !error && orgSlug && !orgAccess && !orgFromList ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Organization not found.
            </CardContent>
          </Card>
        ) : null}

        {!pageLoading && !error && orgSlug ? (
          <>
            <OrgTeamStatsCards members={members} invitations={invitations} />

            <div className="space-y-3 sm:space-y-4">
              <SlidingTabs
                value={selectedTab}
                onValueChange={(value) => setSelectedTab(value as OrgTeamTab)}
              >
                <SlidingTabsList
                  size="primary"
                  remeasureDeps={[members.length, invitations.length]}
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
                  searchQuery={searchQuery}
                  filterRole={filterRole}
                  onSearchChange={setSearchQuery}
                  onFilterRoleChange={setFilterRole}
                  onToggleStatus={handleToggleMemberStatus}
                  onEditContact={handleEditContact}
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

              {selectedTab === 'permissions' ? <OrgTeamPermissionsTab /> : null}
            </div>
          </>
        ) : null}

        <OrgInviteMemberDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          email={inviteEmail}
          contactPhone={inviteContactPhone}
          roleId={inviteRoleId}
          onEmailChange={setInviteEmail}
          onContactPhoneChange={setInviteContactPhone}
          onRoleChange={setInviteRoleId}
          onSubmit={handleInvite}
          submitPending={inviteMember.isPending}
        />

        <EditMemberContactDialog
          open={showContactDialog}
          member={selectedMember}
          roleConfig={
            selectedMember
              ? {
                  scope: 'org',
                  roleId: selectedMember.role,
                  locked: selectedMember.isOwner,
                  editable: canManage && !selectedMember.isOwner,
                }
              : null
          }
          onOpenChange={setShowContactDialog}
          onSave={handleSaveContact}
          savePending={updateMember.isPending}
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
                  permissions: [],
                  status: selectedMember.status,
                  planLimited: false,
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
