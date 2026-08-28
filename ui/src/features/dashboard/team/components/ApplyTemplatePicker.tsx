import { useMemo, useState } from 'react';

import {
  findMatchingTemplate,
  permissionSetEqual,
} from '@/features/dashboard/team/lib/permissionTreeState';
import { PROPERTY_ADMIN_ROLE_ID } from '@/features/dashboard/team/lib/propertyTeamConstants';
import { getRolePermissions } from '@/features/dashboard/team/lib/propertyTeamRoles';
import { sortTemplatesForDisplay } from '@/features/dashboard/team/lib/propertyTeamTemplates';
import type {
  CustomPropertyRole,
  PropertyRoleId,
} from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CUSTOM_VALUE = '__custom__';

type Props = {
  roleId?: PropertyRoleId;
  permissions: string[];
  templates: CustomPropertyRole[];
  /**
   * When true, only copies permission checkboxes from the chosen role
   * (does not require / report a member role id). Used when creating/editing a role definition.
   */
  permissionsOnly?: boolean;
  onApply: (roleId: PropertyRoleId, permissions: string[]) => void;
  onManageTemplates?: () => void;
  showManageTemplates?: boolean;
  disabled?: boolean;
};

export function ApplyTemplatePicker({
  permissions,
  templates,
  onApply,
  onManageTemplates,
  showManageTemplates = false,
  disabled = false,
}: Props) {
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  const sorted = useMemo(() => sortTemplatesForDisplay(templates), [templates]);
  const matched = useMemo(
    () => findMatchingTemplate(permissions, templates),
    [permissions, templates]
  );
  const isCustom = !matched;
  const selectValue = matched?.id ?? CUSTOM_VALUE;

  const applyValue = (value: string) => {
    if (value === CUSTOM_VALUE) {
      onApply(PROPERTY_ADMIN_ROLE_ID, []);
      return;
    }
    onApply(value, getRolePermissions(value, templates));
  };

  const tryApply = (value: string) => {
    if (value === selectValue) return;

    const nextPermissions = value === CUSTOM_VALUE ? [] : getRolePermissions(value, templates);
    const divergedFromCurrent =
      Boolean(matched) && !permissionSetEqual(permissions, matched!.permissions);
    const clearingOrReplacing =
      divergedFromCurrent ||
      (isCustom && permissions.length > 0) ||
      (value === CUSTOM_VALUE && permissions.length > 0) ||
      (!isCustom && value !== matched?.id && permissions.length > 0);

    if (clearingOrReplacing && !permissionSetEqual(permissions, nextPermissions)) {
      setPendingValue(value);
      return;
    }

    applyValue(value);
  };

  const confirmApply = () => {
    if (!pendingValue) return;
    applyValue(pendingValue);
    setPendingValue(null);
  };

  const pendingIsCustom = pendingValue === CUSTOM_VALUE;

  return (
    <div className="space-y-2">
      <Label htmlFor="apply-baseline-role">Based on</Label>
      <Select
        value={selectValue}
        onValueChange={(value) => {
          if (value === '__manage__') {
            onManageTemplates?.();
            return;
          }
          tryApply(value);
        }}
        disabled={disabled || sorted.length === 0}
      >
        <SelectTrigger id="apply-baseline-role" className="h-11">
          <SelectValue placeholder="Choose a role">{matched?.name ?? 'Custom'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sorted.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>Custom</SelectItem>
          {showManageTemplates && onManageTemplates ? (
            <SelectItem value="__manage__">Manage roles…</SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      <ResponsiveModal
        open={pendingValue != null}
        onOpenChange={(open) => {
          if (!open) setPendingValue(null);
        }}
      >
        <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {pendingIsCustom ? 'Start from scratch?' : 'Use this role?'}
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <p className="text-muted-foreground text-sm">
            {pendingIsCustom
              ? 'This clears all permission checkboxes.'
              : 'This replaces the current checkboxes with that role’s permissions.'}
          </p>
          <ResponsiveModalFooter className="gap-1">
            <Button variant="outline" onClick={() => setPendingValue(null)}>
              Cancel
            </Button>
            <Button onClick={confirmApply}>{pendingIsCustom ? 'Clear' : 'Apply'}</Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}
