import type { LucideIcon } from 'lucide-react';

export type BuiltinPropertyRole = 'MANAGER' | 'STAFF' | 'VIEWER';

/** @deprecated Use BuiltinPropertyRole — kept for built-in presets */
export type PropertyRole = BuiltinPropertyRole;

/** Built-in (`MANAGER` | `STAFF` | `VIEWER`) or `custom-*` id */
export type PropertyRoleId = string;

export interface CustomPropertyRole {
  id: string;
  name: string;
  permissions: string[];
}

export type TeamMemberStatus = 'active' | 'pending' | 'inactive';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  displayName: string;
  contactPhone: string;
  role: PropertyRoleId;
  permissions: string[];
  /** Snapshot restored on activate after deactivation */
  savedPermissions?: string[];
  status: TeamMemberStatus;
  assignedAt: string;
  lastActive: string | null;
  assignedBy: string;
  fromOrg: boolean;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: PropertyRoleId;
  permissions: string[];
  sentAt: string;
  expiresAt: string;
  sentBy: string;
}

export interface TeamPermission {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
}

export type TeamTab = 'members' | 'invitations' | 'permissions';

export type CustomRoleFormMode = 'create' | 'edit';
