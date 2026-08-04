import { useMemo } from 'react';

import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  scope?: TeamScope;
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  permissions: string[];
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onTogglePermission: (permissionId: string) => void;
  onSubmit: () => void;
  submitPending?: boolean;
};

export function CustomRoleFormDialog({
  scope = 'property',
  open,
  mode,
  name,
  permissions,
  onOpenChange,
  onNameChange,
  onTogglePermission,
  onSubmit,
  submitPending = false,
}: Props) {
  const title = mode === 'create' ? 'New Custom Role' : 'Edit Custom Role';
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

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-h-[min(90dvh,40rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="custom-role-name">Role name</Label>
            <Input
              id="custom-role-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Co-host"
              className="h-10"
              maxLength={48}
            />
          </div>

          <div className="max-h-[min(50dvh,280px)] space-y-3 overflow-y-auto rounded-lg border p-3">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <p className="mb-2 text-sm font-medium">{category}</p>
                <div className="space-y-2 pl-1">
                  {items.map((permission) => (
                    <div key={permission.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`custom-role-${permission.id}`}
                        checked={permissions.includes(permission.id)}
                        onCheckedChange={() => onTogglePermission(permission.id)}
                      />
                      <Label
                        htmlFor={`custom-role-${permission.id}`}
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
        <ResponsiveModalFooter className="gap-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || submitPending}>
            {mode === 'create' ? 'Create Role' : 'Save'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
