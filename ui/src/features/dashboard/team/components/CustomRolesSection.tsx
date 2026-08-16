import { Edit3, Plus, Shield, Trash2 } from 'lucide-react';

import { RoleDot } from '@/features/dashboard/team/components/RoleBadge';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  scope?: TeamScope;
  customRoles: CustomPropertyRole[];
  memberCountByRole: (roleId: string) => number;
  onCreate: () => void;
  onEdit: (role: CustomPropertyRole) => void;
  onDelete: (role: CustomPropertyRole) => void;
  canManage?: boolean;
};

function BuiltinRoleRow({
  label,
  description,
  roleId,
}: {
  label: string;
  description: string;
  roleId: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1 sm:items-center">
      <span className="mt-1.5 shrink-0 sm:mt-0">
        <RoleDot roleId={roleId} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <p className="shrink-0 text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs leading-snug sm:truncate sm:text-sm">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomRoleRow({
  role,
  assignedCount,
  canManage,
  onEdit,
  onDelete,
}: {
  role: CustomPropertyRole;
  assignedCount: number;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 sm:py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium">{role.name}</p>
          <Badge className="h-5 border-transparent bg-violet-500 px-1.5 text-[10px] text-white">
            Custom
          </Badge>
          {assignedCount > 0 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {assignedCount} assigned
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          {role.permissions.length} permission
          {role.permissions.length === 1 ? '' : 's'}
        </p>
      </div>
      {canManage ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground min-h-[44px] min-w-[44px]"
            onClick={onEdit}
            aria-label={`Edit ${role.name}`}
          >
            <Edit3 className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
            onClick={onDelete}
            disabled={assignedCount > 0}
            aria-label={`Delete ${role.name}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function CustomRolesSection({
  scope = 'property',
  customRoles,
  memberCountByRole,
  onCreate,
  onEdit,
  onDelete,
  canManage = true,
}: Props) {
  const config = getTeamScopeConfig(scope);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border">
          <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
            <p className="text-sm font-medium">Standard roles</p>
          </div>
          <div className="px-3 py-2 sm:px-4">
            {config.builtinRoles.map((role) => (
              <BuiltinRoleRow
                key={role.value}
                roleId={role.value}
                label={role.label}
                description={role.description}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-2 px-3 pt-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:pt-3">
            <p className="text-sm font-medium">Custom roles</p>
            {canManage && customRoles.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] w-full sm:w-auto"
                onClick={onCreate}
              >
                <Plus className="mr-2 size-4" aria-hidden />
                New Role
              </Button>
            ) : null}
          </div>
          {customRoles.length === 0 ? (
            <div className="py-5 text-center sm:py-12">
              <Shield className="text-muted-foreground mx-auto size-9" aria-hidden />
              <h3 className="mt-1 text-base font-semibold">No custom roles</h3>
              {canManage ? (
                <Button className="mt-4 min-h-[44px]" onClick={onCreate}>
                  <Plus className="mr-2 size-4" aria-hidden />
                  New Role
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1 px-3 py-2 sm:px-4">
              {customRoles.map((role) => (
                <CustomRoleRow
                  key={role.id}
                  role={role}
                  assignedCount={memberCountByRole(role.id)}
                  canManage={canManage}
                  onEdit={() => onEdit(role)}
                  onDelete={() => onDelete(role)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
