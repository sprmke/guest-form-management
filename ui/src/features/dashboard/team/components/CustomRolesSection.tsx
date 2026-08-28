import type { ReactNode } from 'react';

import { Copy, Edit3, MoreHorizontal, Plus, Trash2 } from 'lucide-react';

import {
  isSeededTemplateName,
  sortTemplatesForDisplay,
} from '@/features/dashboard/team/lib/propertyTeamTemplates';
import {
  isSeededOrgTemplateName,
  sortOrgTemplatesForDisplay,
} from '@/features/dashboard/team/lib/orgTeamTemplates';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';

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
import { cn } from '@/lib/utils';

type Props = {
  scope?: TeamScope;
  customRoles: CustomPropertyRole[];
  memberCountByRole: (roleId: string) => number;
  onCreate: () => void;
  onEdit: (role: CustomPropertyRole) => void;
  onDelete: (role: CustomPropertyRole) => void;
  onDuplicate?: (role: CustomPropertyRole) => void;
  canManage?: boolean;
};

function RoleGroup({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex min-h-8 items-center justify-between gap-2 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-muted-foreground/80 text-xs tabular-nums">{count}</span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BuiltinRoleRow({
  label,
  description,
  roleId,
}: {
  label: string;
  description: string;
  roleId: string;
}) {
  void roleId;
  return (
    <div className="flex items-start gap-2.5 py-2 sm:items-center sm:py-2.5">
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

function RoleRow({
  role,
  assignedCount,
  canManage,
  isDefault,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  role: CustomPropertyRole;
  assignedCount: number;
  canManage: boolean;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  const canDelete = !isDefault && assignedCount === 0;

  return (
    <div className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-1 py-2.5 sm:px-2">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium">{role.name}</p>
          {assignedCount > 0 ? (
            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
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
        <div className="flex shrink-0 items-center gap-0.5">
          {isDefault && onDuplicate ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hidden min-h-[44px] sm:inline-flex"
              onClick={onDuplicate}
            >
              <Copy className="mr-1.5 size-3.5" aria-hidden />
              Duplicate
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground min-h-[44px] min-w-[44px] shrink-0"
                aria-label={`Actions for ${role.name}`}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="mr-2 size-4" aria-hidden />
                Edit
              </DropdownMenuItem>
              {onDuplicate ? (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 size-4" aria-hidden />
                  Duplicate
                </DropdownMenuItem>
              ) : null}
              {!isDefault ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    disabled={!canDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
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
  onDuplicate,
  canManage = true,
}: Props) {
  const config = getTeamScopeConfig(scope);
  const isProperty = scope === 'property';
  const isOrg = scope === 'org';
  const usesTemplates = isProperty || isOrg;

  const defaultRoles = isProperty
    ? sortTemplatesForDisplay(customRoles.filter((role) => isSeededTemplateName(role.name)))
    : isOrg
      ? sortOrgTemplatesForDisplay(customRoles.filter((role) => isSeededOrgTemplateName(role.name)))
      : [];
  const customOnly = isProperty
    ? sortTemplatesForDisplay(customRoles.filter((role) => !isSeededTemplateName(role.name)))
    : isOrg
      ? sortOrgTemplatesForDisplay(
          customRoles.filter((role) => !isSeededOrgTemplateName(role.name))
        )
      : customRoles;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-base sm:text-lg">Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {usesTemplates ? (
          <>
            <RoleGroup title="Default" count={defaultRoles.length}>
              <ul className="border-border divide-border divide-y rounded-lg border">
                {defaultRoles.map((role) => (
                  <li key={role.id} className="px-1 sm:px-1.5">
                    <RoleRow
                      role={role}
                      assignedCount={memberCountByRole(role.id)}
                      canManage={canManage}
                      isDefault
                      onEdit={() => onEdit(role)}
                      onDelete={() => onDelete(role)}
                      onDuplicate={onDuplicate ? () => onDuplicate(role) : undefined}
                    />
                  </li>
                ))}
              </ul>
            </RoleGroup>

            <RoleGroup
              title="Custom"
              count={customOnly.length}
              action={
                canManage && customOnly.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground min-h-[44px] shrink-0"
                    onClick={onCreate}
                  >
                    <Plus className="mr-1.5 size-4" aria-hidden />
                    New role
                  </Button>
                ) : undefined
              }
            >
              {customOnly.length === 0 ? (
                <div className="border-border bg-muted/30 flex flex-col items-start gap-3 rounded-lg border border-dashed px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <p className="text-muted-foreground text-sm">
                    Duplicate a default role, or create your own.
                  </p>
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] shrink-0"
                      onClick={onCreate}
                    >
                      <Plus className="mr-1.5 size-4" aria-hidden />
                      New role
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="border-border divide-border divide-y rounded-lg border">
                  {customOnly.map((role) => (
                    <li key={role.id} className="px-1 sm:px-1.5">
                      <RoleRow
                        role={role}
                        assignedCount={memberCountByRole(role.id)}
                        canManage={canManage}
                        isDefault={false}
                        onEdit={() => onEdit(role)}
                        onDelete={() => onDelete(role)}
                        onDuplicate={onDuplicate ? () => onDuplicate(role) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </RoleGroup>
          </>
        ) : (
          <div className="px-1 sm:px-2">
            {config.builtinRoles.map((role) => (
              <BuiltinRoleRow
                key={role.value}
                roleId={role.value}
                label={role.label}
                description={role.description}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
