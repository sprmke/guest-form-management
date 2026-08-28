import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { RoleDot } from '@/features/dashboard/team/components/RoleBadge';
import { ADD_CUSTOM_ROLE_VALUE } from '@/features/dashboard/team/lib/roleSelectUtils';
import { PROPERTY_ADMIN_ROLE_ID } from '@/features/dashboard/team/lib/propertyTeamConstants';
import { sortTemplatesForDisplay } from '@/features/dashboard/team/lib/propertyTeamTemplates';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';

import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from '@/components/ui/select';

type BuiltinRoleOption = {
  value: string;
  label: string;
};

type Props = {
  scope?: TeamScope;
  customRoles: CustomPropertyRole[];
  builtinRoles?: BuiltinRoleOption[];
  showAddCustomRole?: boolean;
  /** Invite flow: roles only — Admin/full-access is applied via Permissions edit. */
  templatesOnly?: boolean;
};

export function RoleSelectOptions({
  scope = 'property',
  customRoles,
  builtinRoles,
  showAddCustomRole = false,
  templatesOnly = false,
}: Props) {
  const nodes: ReactNode[] = [];

  if (scope === 'property') {
    const templates = sortTemplatesForDisplay(customRoles);
    if (templates.length > 0) {
      nodes.push(
        <SelectGroup key="templates">
          <SelectLabel>Roles</SelectLabel>
          {templates.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              <div className="flex items-center gap-2">
                <RoleDot scope={scope} roleId={role.id} customRoles={customRoles} />
                <span>{role.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      );
    }

    if (!templatesOnly) {
      nodes.push(<SelectSeparator key="sep-custom-perms" />);
      nodes.push(
        <SelectGroup key="custom-permissions">
          <SelectLabel>Full access</SelectLabel>
          <SelectItem value={PROPERTY_ADMIN_ROLE_ID}>
            <div className="flex items-center gap-2">
              <RoleDot scope={scope} roleId={PROPERTY_ADMIN_ROLE_ID} customRoles={customRoles} />
              <span>Admin (full access)</span>
            </div>
          </SelectItem>
        </SelectGroup>
      );
    }
  } else {
    const resolvedBuiltinRoles = builtinRoles ?? getTeamScopeConfig(scope).builtinRoles;
    nodes.push(
      <SelectGroup key="builtin">
        <SelectLabel>Built-in</SelectLabel>
        {resolvedBuiltinRoles.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex items-center gap-2">
              <RoleDot scope={scope} roleId={role.value} />
              <span>{role.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectGroup>
    );

    if (customRoles.length > 0) {
      nodes.push(<SelectSeparator key="sep-custom" />);
      nodes.push(
        <SelectGroup key="custom">
          <SelectLabel>Custom</SelectLabel>
          {customRoles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              <div className="flex items-center gap-2">
                <RoleDot scope={scope} roleId={role.id} customRoles={customRoles} />
                <span>{role.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      );
    }
  }

  if (showAddCustomRole) {
    nodes.push(<SelectSeparator key="sep-add" />);
    nodes.push(
      <SelectItem key="add-custom-role" value={ADD_CUSTOM_ROLE_VALUE}>
        <div className="flex items-center gap-2">
          <Plus className="text-muted-foreground size-4" aria-hidden />
          <span>Add role</span>
        </div>
      </SelectItem>
    );
  }

  return <>{nodes}</>;
}
