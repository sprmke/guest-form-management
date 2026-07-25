import { RoleSelectOptions } from '@/features/dashboard/team/components/RoleSelectOptions';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import {
  getRoleLabelForScope,
  getRolePermissionsForScope,
} from '@/features/dashboard/team/lib/teamRoleHelpers';
import { handleRoleSelectChange } from '@/features/dashboard/team/lib/roleSelectUtils';
import type {
  CustomPropertyRole,
  PropertyRoleId,
  TeamMember,
} from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  scope?: TeamScope;
  open: boolean;
  member: TeamMember | null;
  roleId: PropertyRoleId;
  customRoles: CustomPropertyRole[];
  permissions: string[];
  onOpenChange: (open: boolean) => void;
  onRoleChange: (roleId: PropertyRoleId) => void;
  onTogglePermission: (permissionId: string) => void;
  onSave: () => void;
  onAddCustomRole?: () => void;
  showAddCustomRole?: boolean;
  savePending?: boolean;
};

export function EditPermissionsDialog({
  scope = 'property',
  open,
  member,
  roleId,
  customRoles,
  permissions,
  onOpenChange,
  onRoleChange,
  onTogglePermission,
  onSave,
  onAddCustomRole,
  showAddCustomRole = false,
  savePending = false,
}: Props) {
  if (!member) return null;

  const config = getTeamScopeConfig(scope);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,40rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">{member.email}</p>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={roleId}
              onValueChange={(value) =>
                handleRoleSelectChange(value, onRoleChange, onAddCustomRole)
              }
            >
              <SelectTrigger id="edit-role" className="h-10">
                <SelectValue>{getRoleLabelForScope(scope, roleId, customRoles)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <RoleSelectOptions
                  scope={scope}
                  customRoles={customRoles}
                  showAddCustomRole={showAddCustomRole}
                />
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[240px] space-y-3 overflow-y-auto rounded-lg border p-3">
            {config.categories.map((category) => (
              <div key={category}>
                <p className="mb-2 text-sm font-medium">{category}</p>
                <div className="space-y-2 pl-1">
                  {config.permissions
                    .filter((permission) => permission.category === category)
                    .map((permission) => (
                      <div key={permission.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-${permission.id}`}
                          checked={permissions.includes(permission.id)}
                          onCheckedChange={() => onTogglePermission(permission.id)}
                        />
                        <Label
                          htmlFor={`edit-${permission.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {permission.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={savePending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function permissionsForRole(
  scope: TeamScope,
  roleId: PropertyRoleId,
  customRoles: CustomPropertyRole[]
) {
  return getRolePermissionsForScope(scope, roleId, customRoles);
}
