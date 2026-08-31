import { useMemo, useState } from 'react';

import { ApplyTemplatePicker } from '@/features/dashboard/team/components/ApplyTemplatePicker';
import { OrgRoleListingAccessSection } from '@/features/dashboard/team/components/OrgRoleListingAccessSection';
import { PermissionsTreeView } from '@/features/dashboard/team/components/PermissionsTreeView';
import type { OrgListingAssignments } from '@/features/dashboard/team/components/OrgListingAssignmentPicker';
import { ORG_PERMISSION_CATALOG } from '@/features/dashboard/team/lib/orgPermissionCatalog';
import { PROPERTY_PERMISSION_CATALOG } from '@/features/dashboard/team/lib/propertyPermissionCatalog';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

type Props = {
  scope?: TeamScope;
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  permissions: string[];
  /** Existing roles to use as a baseline when editing property permissions. */
  roles?: CustomPropertyRole[];
  orgSlug?: string;
  allListings?: boolean;
  listingAssignments?: OrgListingAssignments;
  onAllListingsChange?: (value: boolean) => void;
  onListingAssignmentsChange?: (value: OrgListingAssignments) => void;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onTogglePermission: (permissionId: string) => void;
  onPermissionsChange?: (permissions: string[]) => void;
  onSubmit: () => void;
  submitPending?: boolean;
};

export function CustomRoleFormDialog({
  scope = 'property',
  open,
  mode,
  name,
  permissions,
  roles = [],
  orgSlug,
  allListings = false,
  listingAssignments,
  onAllListingsChange,
  onListingAssignmentsChange,
  onOpenChange,
  onNameChange,
  onTogglePermission,
  onPermissionsChange,
  onSubmit,
  submitPending = false,
}: Props) {
  const [sensitivePendingId, setSensitivePendingId] = useState<string | null>(null);
  const [sensitiveResolver, setSensitiveResolver] = useState<((ok: boolean) => void) | null>(null);

  const isProperty = scope === 'property';
  const isOrg = scope === 'org';
  const usesTree = isProperty || isOrg;
  const permissionCatalog = isOrg ? ORG_PERMISSION_CATALOG : PROPERTY_PERMISSION_CATALOG;
  const title =
    mode === 'create'
      ? isProperty
        ? 'New role'
        : 'New role'
      : isProperty
        ? 'Edit role'
        : 'Edit role';
  const canSubmit = name.trim().length > 0 && permissions.length > 0;

  const config = getTeamScopeConfig(scope);
  const grouped = useMemo(
    () =>
      config.categories.map((category) => ({
        category,
        items: config.permissions.filter((permission) => permission.category === category),
      })),
    [config.categories, config.permissions]
  );

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
    if (onPermissionsChange) {
      onPermissionsChange(next);
      return;
    }
    const added = next.find((id) => !permissions.includes(id));
    const removed = permissions.find((id) => !next.includes(id));
    if (added) onTogglePermission(added);
    else if (removed) onTogglePermission(removed);
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
              {title}
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-role-name">Role name</Label>
                <Input
                  id="custom-role-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder={isProperty ? 'e.g. Front desk' : 'e.g. Co-host'}
                  className="h-11"
                  maxLength={48}
                  autoComplete="off"
                />
              </div>

              {usesTree ? (
                <>
                  {isOrg &&
                  orgSlug &&
                  onAllListingsChange &&
                  onListingAssignmentsChange &&
                  listingAssignments ? (
                    <OrgRoleListingAccessSection
                      orgSlug={orgSlug}
                      allListings={allListings}
                      assignments={listingAssignments}
                      onAllListingsChange={onAllListingsChange}
                      onAssignmentsChange={onListingAssignmentsChange}
                    />
                  ) : null}

                  {roles.length > 0 && onPermissionsChange ? (
                    <ApplyTemplatePicker
                      permissions={permissions}
                      templates={roles}
                      permissionsOnly
                      onApply={(_roleId, nextPermissions) => {
                        onPermissionsChange(nextPermissions);
                      }}
                    />
                  ) : null}

                  <PermissionsTreeView
                    permissions={permissions}
                    onChange={handleTreeChange}
                    catalog={permissionCatalog}
                    onSensitiveEnable={requestSensitiveEnable}
                  />
                </>
              ) : (
                <div className="space-y-3 rounded-lg border p-3">
                  {grouped.map(({ category, items }) => (
                    <div key={category}>
                      <p className="mb-2 text-sm font-medium">{category}</p>
                      <div className="space-y-2 pl-1">
                        {items.map((permission) => (
                          <div key={permission.id} className="flex items-center gap-2.5">
                            <Checkbox
                              id={`custom-role-${permission.id}`}
                              checked={permissions.includes(permission.id)}
                              onCheckedChange={() => onTogglePermission(permission.id)}
                              className="size-5"
                            />
                            <Label
                              htmlFor={`custom-role-${permission.id}`}
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
              )}
            </div>
          </div>

          <ResponsiveModalFooter className="border-border/60 shrink-0 gap-2 border-t px-4 py-3 sm:px-5">
            <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={onSubmit}
              disabled={!canSubmit || submitPending}
            >
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
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
            This role can manage other members&apos; access.
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
