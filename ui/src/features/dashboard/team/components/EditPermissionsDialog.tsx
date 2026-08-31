import { useState } from 'react';

import { ApplyTemplatePicker } from '@/features/dashboard/team/components/ApplyTemplatePicker';
import { PermissionsTreeView } from '@/features/dashboard/team/components/PermissionsTreeView';
import { RoleSelectOptions } from '@/features/dashboard/team/components/RoleSelectOptions';
import { findMatchingTemplate } from '@/features/dashboard/team/lib/permissionTreeState';
import { PROPERTY_ADMIN_ROLE_ID } from '@/features/dashboard/team/lib/propertyTeamConstants';
import { handleRoleSelectChange } from '@/features/dashboard/team/lib/roleSelectUtils';
import {
  getRoleLabelForScope,
  getRolePermissionsForScope,
} from '@/features/dashboard/team/lib/teamRoleHelpers';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type {
  CustomPropertyRole,
  PropertyRoleId,
  TeamMember,
} from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  scope?: TeamScope;
  open: boolean;
  member: TeamMember | null;
  roleId: PropertyRoleId;
  customRoles: CustomPropertyRole[];
  permissions: string[];
  onOpenChange: (open: boolean) => void;
  onRoleChange: (roleId: PropertyRoleId) => void;
  onPermissionsChange?: (permissions: string[]) => void;
  onTogglePermission: (permissionId: string) => void;
  onSave: () => void;
  onAddCustomRole?: () => void;
  showAddCustomRole?: boolean;
  savePending?: boolean;
  readOnly?: boolean;
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
  onPermissionsChange,
  onTogglePermission,
  onSave,
  onAddCustomRole,
  showAddCustomRole = false,
  savePending = false,
  readOnly = false,
}: Props) {
  const [sensitivePendingId, setSensitivePendingId] = useState<string | null>(null);
  const [sensitiveResolver, setSensitiveResolver] = useState<((ok: boolean) => void) | null>(null);

  if (!member) return null;

  const config = getTeamScopeConfig(scope);
  const isProperty = scope === 'property';

  const requestSensitiveEnable = (permissionId: string): Promise<boolean> =>
    new Promise((resolve) => {
      setSensitivePendingId(permissionId);
      setSensitiveResolver(() => resolve);
    });

  const resolveSensitive = (ok: boolean) => {
    sensitiveResolver?.(ok);
    setSensitiveResolver(null);
    setSensitivePendingId(null);
  };

  const handleTreeChange = (next: string[]) => {
    if (readOnly || !onPermissionsChange) {
      const added = next.find((id) => !permissions.includes(id));
      const removed = permissions.find((id) => !next.includes(id));
      if (added) onTogglePermission(added);
      else if (removed) onTogglePermission(removed);
      return;
    }

    const matched = findMatchingTemplate(next, customRoles);
    onPermissionsChange(next);
    if (matched) {
      onRoleChange(matched.id);
    } else if (roleId !== PROPERTY_ADMIN_ROLE_ID) {
      onRoleChange(PROPERTY_ADMIN_ROLE_ID);
    }
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent
          sheetLayout="split"
          className={cn(
            'flex max-h-[min(92dvh,52rem)] w-[min(calc(100vw-1.5rem),48rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(95vw,48rem)] sm:p-0'
          )}
        >
          <ResponsiveModalHeader className="border-border/60 shrink-0 space-y-0 border-b px-4 py-3 sm:px-5 sm:py-4">
            <ResponsiveModalTitle className="pr-8 text-base sm:text-lg">
              Edit permissions
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-5">
            <div className="space-y-4">
              <p className="text-muted-foreground truncate text-sm">{member.email}</p>

              {isProperty ? (
                <>
                  <ApplyTemplatePicker
                    roleId={roleId}
                    permissions={permissions}
                    templates={customRoles}
                    disabled={readOnly || member.fromOrg}
                    showManageTemplates={showAddCustomRole}
                    onManageTemplates={onAddCustomRole}
                    onApply={(nextRoleId, nextPermissions) => {
                      if (onPermissionsChange) {
                        onPermissionsChange(nextPermissions);
                        onRoleChange(nextRoleId);
                      } else {
                        onRoleChange(nextRoleId);
                        for (const id of nextPermissions) {
                          if (!permissions.includes(id)) onTogglePermission(id);
                        }
                        for (const id of permissions) {
                          if (!nextPermissions.includes(id)) onTogglePermission(id);
                        }
                      }
                    }}
                  />
                  <PermissionsTreeView
                    permissions={permissions}
                    readOnly={readOnly || member.fromOrg}
                    onChange={handleTreeChange}
                    onSensitiveEnable={requestSensitiveEnable}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select
                      value={roleId}
                      onValueChange={(value) =>
                        handleRoleSelectChange(value, onRoleChange, onAddCustomRole)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger id="edit-role" className="h-11">
                        <SelectValue>
                          {getRoleLabelForScope(scope, roleId, customRoles)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <RoleSelectOptions
                          scope={scope}
                          customRoles={customRoles}
                          showAddCustomRole={showAddCustomRole}
                          selectedRoleId={roleId}
                        />
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 rounded-lg border p-3">
                    {config.categories.map((category) => (
                      <div key={category}>
                        <p className="mb-2 text-sm font-medium">{category}</p>
                        <div className="space-y-2 pl-1">
                          {config.permissions
                            .filter((permission) => permission.category === category)
                            .map((permission) => (
                              <div key={permission.id} className="flex items-center gap-2.5">
                                <Checkbox
                                  id={`edit-${permission.id}`}
                                  checked={permissions.includes(permission.id)}
                                  disabled={readOnly}
                                  onCheckedChange={() => onTogglePermission(permission.id)}
                                  className="size-5"
                                />
                                <Label
                                  htmlFor={`edit-${permission.id}`}
                                  className="cursor-pointer text-sm font-normal leading-snug"
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <ResponsiveModalFooter className="border-border/60 shrink-0 gap-2 border-t px-4 py-3 sm:px-5">
            <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {readOnly || member.fromOrg ? null : (
              <Button className="min-h-[44px]" onClick={onSave} disabled={savePending}>
                Save
              </Button>
            )}
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={sensitivePendingId != null}
        onOpenChange={(next) => {
          if (!next) resolveSensitive(false);
        }}
      >
        <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Allow team management?</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <p className="text-muted-foreground text-sm">
            This member can manage other members&apos; access.
          </p>
          <ResponsiveModalFooter className="gap-1">
            <Button variant="outline" onClick={() => resolveSensitive(false)}>
              Cancel
            </Button>
            <Button onClick={() => resolveSensitive(true)}>Allow</Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}

export function permissionsForRole(
  scope: TeamScope,
  roleId: PropertyRoleId,
  customRoles: CustomPropertyRole[]
) {
  return getRolePermissionsForScope(scope, roleId, customRoles);
}
