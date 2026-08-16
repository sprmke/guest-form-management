import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { RoleDot } from '@/features/dashboard/team/components/RoleBadge';
import { ADD_CUSTOM_ROLE_VALUE } from '@/features/dashboard/team/lib/roleSelectUtils';
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
};

export function RoleSelectOptions({
  scope = 'property',
  customRoles,
  builtinRoles,
  showAddCustomRole = false,
}: Props) {
  const resolvedBuiltinRoles = builtinRoles ?? getTeamScopeConfig(scope).builtinRoles;
  const nodes: ReactNode[] = [
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
    </SelectGroup>,
  ];

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

  if (showAddCustomRole) {
    nodes.push(<SelectSeparator key="sep-add" />);
    nodes.push(
      <SelectItem key="add-custom-role" value={ADD_CUSTOM_ROLE_VALUE}>
        <div className="flex items-center gap-2">
          <Plus className="text-muted-foreground size-4" aria-hidden />
          <span>Add Custom Role</span>
        </div>
      </SelectItem>
    );
  }

  return <>{nodes}</>;
}
