import { useMemo } from 'react';

import {
  Building2,
  ChevronDown,
  Filter,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { TeamInviteTierBadgeAnchor } from '@/features/dashboard/plans/components/TierBadge';
import { PlanGatedText } from '@/features/dashboard/plans/components/PlanUpgradeLink';
import { OrgManagedMemberLink } from '@/features/dashboard/team/components/OrgManagedMemberLink';
import { RoleBadge } from '@/features/dashboard/team/components/RoleBadge';
import { TeamMemberStatusBadge } from '@/features/dashboard/team/components/TeamMemberStatusBadge';
import {
  currentTeamMemberRowClassName,
  isCurrentTeamMember,
  sortTeamMembersWithCurrentUserFirst,
} from '@/features/dashboard/team/lib/sortTeamMembersByCurrentUser';
import { planLimitedTeamBannerMessage } from '@/features/dashboard/team/lib/planLimitedTeamCopy';
import { isTeamMemberActive } from '@/features/dashboard/team/lib/teamMemberAccess';
import {
  canEditPropertyMemberContact,
  memberContactLabel,
} from '@/features/dashboard/team/lib/teamMemberContact';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type { CustomPropertyRole, TeamMember } from '@/features/dashboard/team/types/propertyTeam';

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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Props = {
  scope?: TeamScope;
  members: TeamMember[];
  customRoles: CustomPropertyRole[];
  searchQuery: string;
  filterRole: string;
  onSearchChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onEditPermissions: (member: TeamMember) => void;
  onEditContact: (member: TeamMember) => void;
  onToggleStatus: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onInvite: () => void;
  canInvite?: boolean;
  /** From `teamInviteCapacity.canInvite` — drives the corner plan pill. */
  canInviteByPlan?: boolean;
  /** Legacy umbrella (parking). Prefer canEditMembers / canDeleteMembers on property. */
  canManage?: boolean;
  canEditMembers?: boolean;
  canDeleteMembers?: boolean;
  showEditPermissions?: boolean;
  /** Built-in roles for filter (defaults to property roles). */
  builtinRoles?: Array<{ value: string; label: string }>;
  removeFromLabel?: string;
};

function memberInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TeamMembersTab({
  scope = 'property',
  members,
  customRoles,
  searchQuery,
  filterRole,
  onSearchChange,
  onFilterRoleChange,
  onEditPermissions,
  onEditContact,
  onToggleStatus,
  onRemove,
  onInvite,
  canInvite = true,
  canInviteByPlan,
  canManage = true,
  canEditMembers,
  canDeleteMembers,
  showEditPermissions = true,
  removeFromLabel = getTeamScopeConfig(scope).removeFromLabel,
  builtinRoles = getTeamScopeConfig(scope).builtinRoles,
}: Props) {
  const allowEditMembers = canEditMembers ?? canManage;
  const allowDeleteMembers = canDeleteMembers ?? canManage;
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  const orgSlug = orgContext?.orgSlug ?? parkingContext?.orgSlug ?? null;
  if (!orgSlug) {
    throw new Error(
      'TeamMembersTab must be used within RequireOrgContext or RequireParkingContext'
    );
  }
  const { email: currentUserEmail } = useAdminSession();

  const planLimitedCount = useMemo(
    () => members.filter((member) => member.status === 'inactive' && member.planLimited).length,
    [members]
  );

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
      {planLimitedCount > 0 ? (
        <div className="border-warning/30 bg-warning/10 flex items-start gap-2 rounded-lg border p-3 sm:p-4">
          <Sparkles className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-sm">
            <PlanGatedText
              feature="teamManagement"
              text={planLimitedTeamBannerMessage(planLimitedCount)}
              linkClassName="text-warning"
            />
          </p>
        </div>
      ) : null}

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
            className="h-10 pl-10"
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
            {builtinRoles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
            {customRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
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
            const isActive = isTeamMemberActive(member);
            const isCurrentUser = isCurrentTeamMember(member.email, currentUserEmail);
            const canEditContact = canEditPropertyMemberContact(member, allowEditMembers);
            const contactLine = memberContactLabel(member);

            return (
              <div
                key={member.id}
                className={cn(
                  'border-border/60 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 sm:gap-4 sm:p-4',
                  isCurrentUser && currentTeamMemberRowClassName,
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
                      {member.fromOrg ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-5 gap-1 px-1.5 text-[10px] font-medium"
                            >
                              <Building2 className="size-2.5" aria-hidden />
                              Org
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Inherited from organization</TooltipContent>
                        </Tooltip>
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

                <div
                  className={cn('flex flex-wrap items-center gap-1.5', !isActive && 'opacity-50')}
                  title={!isActive ? 'Role applies when member is active' : undefined}
                >
                  <RoleBadge
                    scope={scope}
                    roleId={member.role}
                    customRoles={customRoles}
                    muted={!isActive || member.planLimited}
                  />
                  <TeamMemberStatusBadge status={member.status} planLimited={member.planLimited} />
                </div>

                <div className="flex w-full flex-wrap items-center justify-end sm:ml-auto sm:w-auto">
                  {member.fromOrg ? (
                    <OrgManagedMemberLink orgSlug={orgSlug} />
                  ) : canEditContact || allowEditMembers || allowDeleteMembers ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] sm:min-h-9"
                          aria-label={`Manage ${member.name}`}
                        >
                          Manage
                          <ChevronDown className="ml-1.5 size-3.5" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditContact ? (
                          <DropdownMenuItem
                            onSelect={() => {
                              window.setTimeout(() => onEditContact(member), 0);
                            }}
                          >
                            Host details
                          </DropdownMenuItem>
                        ) : null}
                        {allowEditMembers && showEditPermissions ? (
                          <DropdownMenuItem
                            disabled={!isActive}
                            onSelect={() => {
                              window.setTimeout(() => onEditPermissions(member), 0);
                            }}
                          >
                            <Shield className="mr-2 size-4" aria-hidden />
                            Permissions
                          </DropdownMenuItem>
                        ) : null}
                        {allowEditMembers ? (
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
                        ) : null}
                        {allowDeleteMembers ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => {
                                window.setTimeout(() => onRemove(member), 0);
                              }}
                            >
                              <UserMinus className="mr-2 size-4" aria-hidden />
                              {removeFromLabel}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 ? (
            <div className="py-10 text-center sm:py-12">
              <Users className="text-muted-foreground mx-auto size-11" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">No members found</h3>
              {!searchQuery && canInvite ? (
                <TeamInviteTierBadgeAnchor canInvite={canInviteByPlan} className="mt-4">
                  <Button className="min-h-[44px]" onClick={onInvite}>
                    Invite Member
                  </Button>
                </TeamInviteTierBadgeAnchor>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
