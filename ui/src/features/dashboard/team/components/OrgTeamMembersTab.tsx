import { useMemo } from 'react';

import {
  Crown,
  Edit3,
  Filter,
  MoreHorizontal,
  Search,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from 'lucide-react';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import { OrgRoleBadge } from '@/features/dashboard/team/components/OrgRoleBadge';
import { TeamMemberStatusBadge } from '@/features/dashboard/team/components/TeamMemberStatusBadge';
import { ORG_ROLES } from '@/features/dashboard/team/lib/orgTeamConstants';
import {
  currentTeamMemberRowClassName,
  isCurrentTeamMember,
  sortTeamMembersWithCurrentUserFirst,
} from '@/features/dashboard/team/lib/sortTeamMembersByCurrentUser';
import {
  canEditOrgMemberContact,
  memberContactLabel,
} from '@/features/dashboard/team/lib/teamMemberContact';
import type { OrgTeamMember } from '@/features/dashboard/team/types/orgTeam';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  members: OrgTeamMember[];
  searchQuery: string;
  filterRole: string;
  onSearchChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onToggleStatus: (member: OrgTeamMember) => void;
  onEditContact: (member: OrgTeamMember) => void;
  onRemove: (member: OrgTeamMember) => void;
  onInvite: () => void;
  canInvite?: boolean;
  canManage?: boolean;
};

function memberInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrgTeamMembersTab({
  members,
  searchQuery,
  filterRole,
  onSearchChange,
  onFilterRoleChange,
  onToggleStatus,
  onEditContact,
  onRemove,
  onInvite,
  canInvite = true,
  canManage = true,
}: Props) {
  const { email: currentUserEmail } = useAdminSession();

  const filteredMembers = useMemo(() => {
    const filtered = members.filter((member) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        member.name.toLowerCase().includes(q) || member.email.toLowerCase().includes(q);
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      return matchesSearch && matchesRole;
    });
    return sortTeamMembersWithCurrentUserFirst(filtered, currentUserEmail);
  }, [members, searchQuery, filterRole, currentUserEmail]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-9"
            aria-label="Search team members"
          />
        </div>
        <Select value={filterRole} onValueChange={onFilterRoleChange}>
          <SelectTrigger className="h-10 min-h-[44px] w-full sm:w-[180px]">
            <Filter className="mr-2 size-4 shrink-0" aria-hidden />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ORG_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">
            Team Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredMembers.map((member) => {
            const isActive = member.status === 'active';
            const isCurrentUser = isCurrentTeamMember(member.email, currentUserEmail);
            const canEditContact = canEditOrgMemberContact(member, currentUserEmail, canManage);
            const contactLine = memberContactLabel(member);

            return (
              <div
                key={member.id}
                className={cn(
                  'border-border/60 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 sm:gap-4 sm:p-4',
                  isCurrentUser && currentTeamMemberRowClassName,
                  !isCurrentUser &&
                    member.isOwner &&
                    'border-amber-200/80 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/20',
                  !isActive && 'opacity-80'
                )}
                aria-current={isCurrentUser ? 'true' : undefined}
              >
                <div className="flex min-w-0 flex-1 basis-[min(100%,12rem)] items-center gap-3">
                  <Avatar className={cn('size-10 shrink-0', !isActive && 'grayscale')}>
                    <AvatarImage src={member.avatar ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {memberInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {member.name}
                      </p>
                      {member.isOwner ? (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 px-1.5 text-[10px] font-medium"
                        >
                          <Crown className="size-2.5" aria-hidden />
                          Owner
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                    {contactLine ? (
                      <p className="text-muted-foreground truncate text-xs tabular-nums">
                        {contactLine}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <OrgRoleBadge roleId={member.role} />
                  <TeamMemberStatusBadge status={member.status} />
                </div>

                {canEditContact || (!member.isOwner && canManage) ? (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
                    {canEditContact ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] sm:min-h-9"
                        onClick={() => onEditContact(member)}
                      >
                        <Edit3 className="mr-1.5 size-3.5" aria-hidden />
                        Manage
                      </Button>
                    ) : null}

                    {!member.isOwner && canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px] shrink-0 sm:min-h-9 sm:min-w-9"
                            aria-label={`Actions for ${member.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onToggleStatus(member)}>
                            {isActive ? (
                              <>
                                <UserX className="mr-2 size-4" aria-hidden />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 size-4" aria-hidden />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              window.setTimeout(() => onRemove(member), 0);
                            }}
                          >
                            <UserMinus className="mr-2 size-4" aria-hidden />
                            Remove from Organization
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {filteredMembers.length === 0 ? (
            <div className="py-10 text-center sm:py-12">
              <Users className="text-muted-foreground mx-auto size-11" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">No members found</h3>
              {!searchQuery && canInvite ? (
                <Button className="mt-4 min-h-[44px]" onClick={onInvite}>
                  Invite Member
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
