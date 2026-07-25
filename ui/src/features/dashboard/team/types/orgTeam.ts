export type OrgRoleId = 'OWNER' | 'ADMIN';

export type OrgTeamMemberStatus = 'active' | 'inactive';

export interface OrgTeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  displayName: string;
  contactPhone: string;
  role: OrgRoleId;
  status: OrgTeamMemberStatus;
  assignedAt: string;
  lastActive: string | null;
  assignedBy: string;
  isOwner: boolean;
}

export interface OrgTeamInvitation {
  id: string;
  email: string;
  role: OrgRoleId;
  sentAt: string;
  expiresAt: string;
  sentBy: string;
}

export type OrgTeamTab = 'members' | 'invitations' | 'permissions';

export type OrgTeamAccess = {
  canManage: boolean;
  accessKind: 'owner' | 'platform_admin' | 'org_admin';
};
