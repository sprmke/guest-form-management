import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';
import { orgTeamGet, orgTeamMutate } from '@/features/dashboard/team/lib/orgTeamApi';
import type {
  OrgRoleId,
  OrgTeamAccess,
  OrgTeamInvitation,
  OrgTeamMember,
} from '@/features/dashboard/team/types/orgTeam';

import { friendlyToastError } from '@/lib/feedback/toastMessages';

export const ORG_TEAM_QUERY_KEY = ['org-team'] as const;

export type OrgTeamData = {
  members: OrgTeamMember[];
  invitations: OrgTeamInvitation[];
  access: OrgTeamAccess;
};

async function loadOrgTeam(orgSlug: string, orgId: string): Promise<OrgTeamData> {
  const [membersPayload, invitationsPayload] = await Promise.all([
    orgTeamGet<{
      members: OrgTeamMember[];
      access: OrgTeamAccess;
    }>('/org-team-members', orgSlug, orgId),
    orgTeamGet<{ invitations: OrgTeamInvitation[] }>('/org-team-invitations', orgSlug, orgId),
  ]);

  return {
    members: membersPayload.members ?? [],
    invitations: invitationsPayload.invitations ?? [],
    access: membersPayload.access ?? { canManage: false, accessKind: 'org_admin' },
  };
}

export function useOrgTeam(orgId: string | null) {
  const { orgSlug } = useOrgScopeKey();

  return useQuery({
    queryKey: [...ORG_TEAM_QUERY_KEY, orgSlug, orgId],
    queryFn: () => {
      if (!orgSlug || !orgId) throw new Error('Organization not found');
      return loadOrgTeam(orgSlug, orgId);
    },
    enabled: Boolean(orgSlug && orgId),
  });
}

export function useOrgTeamMutations(orgId: string | null) {
  const { orgSlug } = useOrgScopeKey();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [...ORG_TEAM_QUERY_KEY, orgSlug, orgId],
    });
  };

  const requireOrg = () => {
    if (!orgSlug) throw new Error('Organization not found');
    return { orgSlug, orgId };
  };

  const inviteMember = useMutation({
    mutationFn: async (input: { email: string; contactPhone: string; roleId: OrgRoleId }) => {
      const { orgSlug: slug, orgId: id } = requireOrg();
      return orgTeamMutate<{ invitation: OrgTeamInvitation }>(
        '/org-team-invitations',
        slug,
        id,
        'POST',
        {
          email: input.email.trim(),
          contactPhone: input.contactPhone.trim(),
          roleId: input.roleId,
        }
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(friendlyToastError(error, 'Failed to send invitation'));
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { orgSlug: slug, orgId: id } = requireOrg();
      return orgTeamMutate<{ invitation: OrgTeamInvitation }>(
        '/org-team-invitations',
        slug,
        id,
        'POST',
        { action: 'resend', invitationId }
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success('Invitation resent');
    },
    onError: (error: Error) => {
      toast.error(friendlyToastError(error, 'Failed to resend invitation'));
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { orgSlug: slug, orgId: id } = requireOrg();
      return orgTeamMutate<{ cancelled: boolean }>('/org-team-invitations', slug, id, 'DELETE', {
        invitationId,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(friendlyToastError(error, 'Failed to cancel invitation'));
    },
  });

  const updateMember = useMutation({
    mutationFn: async (input: {
      memberId: string;
      status?: 'active' | 'inactive';
      displayName?: string;
      contactPhone?: string;
      roleId?: string;
    }) => {
      const { orgSlug: slug, orgId: id } = requireOrg();
      return orgTeamMutate<{ member: OrgTeamMember }>(
        '/org-team-members',
        slug,
        id,
        'PATCH',
        input
      );
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(friendlyToastError(error, 'Failed to update member'));
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { orgSlug: slug, orgId: id } = requireOrg();
      return orgTeamMutate<{ removed: boolean }>('/org-team-members', slug, id, 'DELETE', {
        memberId,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(friendlyToastError(error, 'Failed to remove member'));
    },
  });

  return {
    inviteMember,
    resendInvitation,
    cancelInvitation,
    updateMember,
    removeMember,
  };
}
