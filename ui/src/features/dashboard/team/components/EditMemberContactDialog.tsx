import { useEffect, useState } from 'react';

import { RoleSelectOptions } from '@/features/dashboard/team/components/RoleSelectOptions';
import { ORG_ROLES, getOrgRoleLabel } from '@/features/dashboard/team/lib/orgTeamConstants';
import { getRoleLabel } from '@/features/dashboard/team/lib/propertyTeamRoles';
import { handleRoleSelectChange } from '@/features/dashboard/team/lib/roleSelectUtils';
import { getRoleLabelForScope } from '@/features/dashboard/team/lib/teamRoleHelpers';
import type {
  EditMemberContactSaveInput,
  EditMemberRoleConfig,
  TeamContactMember,
} from '@/features/dashboard/team/types/teamContact';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ASSIGNABLE_ORG_ROLES = ORG_ROLES.filter((role) => role.value !== 'OWNER');

type Props = {
  open: boolean;
  member: TeamContactMember | null;
  roleConfig: EditMemberRoleConfig | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: EditMemberContactSaveInput) => Promise<void>;
  savePending?: boolean;
};

export function EditMemberContactDialog({
  open,
  member,
  roleConfig,
  onOpenChange,
  onSave,
  savePending = false,
}: Props) {
  const [displayName, setDisplayName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [roleId, setRoleId] = useState('');

  useEffect(() => {
    if (!member) return;
    setDisplayName(member.displayName || member.name);
    setContactPhone(member.contactPhone || '');
    setRoleId(roleConfig?.roleId ?? '');
  }, [member, roleConfig?.roleId]);

  const handleSave = async () => {
    const input: EditMemberContactSaveInput = {
      displayName: displayName.trim(),
      contactPhone: contactPhone.trim(),
    };
    if (roleConfig?.editable && roleId && roleId !== roleConfig.roleId) {
      input.roleId = roleId;
    }
    await onSave(input);
  };

  const roleLabel =
    roleConfig?.scope === 'org'
      ? getOrgRoleLabel(roleConfig.roleId)
      : roleConfig?.scope === 'property'
        ? getRoleLabel(roleConfig.roleId, roleConfig.customRoles)
        : roleConfig?.scope === 'parking'
          ? getRoleLabelForScope('parking', roleConfig.roleId, roleConfig.customRoles)
          : null;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Host details</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        {member ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-member-display-name">Name</Label>
              <Input
                id="team-member-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-member-contact-phone">Phone</Label>
              <Input
                id="team-member-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                autoComplete="tel"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-member-email">Email</Label>
              <Input id="team-member-email" value={member.email} disabled className="h-10" />
            </div>
            {roleConfig ? (
              <div className="space-y-2">
                <Label htmlFor="team-member-role">Role</Label>
                {roleConfig.scope === 'org' && roleConfig.locked ? (
                  <Input id="team-member-role" value="Owner" disabled className="h-10" />
                ) : roleConfig.editable && roleConfig.scope === 'org' ? (
                  <Select value={roleId} onValueChange={setRoleId}>
                    <SelectTrigger id="team-member-role" className="h-10 min-h-[44px]">
                      <SelectValue>{getOrgRoleLabel(roleId)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ORG_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : roleConfig.editable && roleConfig.scope === 'property' ? (
                  <Select
                    value={roleId}
                    onValueChange={(value) =>
                      handleRoleSelectChange(value, setRoleId, roleConfig.onAddCustomRole)
                    }
                  >
                    <SelectTrigger id="team-member-role" className="h-10 min-h-[44px]">
                      <SelectValue>{getRoleLabel(roleId, roleConfig.customRoles)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <RoleSelectOptions
                        customRoles={roleConfig.customRoles}
                        showAddCustomRole={Boolean(roleConfig.onAddCustomRole)}
                      />
                    </SelectContent>
                  </Select>
                ) : roleConfig.editable && roleConfig.scope === 'parking' ? (
                  <Select
                    value={roleId}
                    onValueChange={(value) =>
                      handleRoleSelectChange(value, setRoleId, roleConfig.onAddCustomRole)
                    }
                  >
                    <SelectTrigger id="team-member-role" className="h-10 min-h-[44px]">
                      <SelectValue>
                        {getRoleLabelForScope('parking', roleId, roleConfig.customRoles)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <RoleSelectOptions
                        scope="parking"
                        customRoles={roleConfig.customRoles}
                        showAddCustomRole={Boolean(roleConfig.onAddCustomRole)}
                      />
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="team-member-role" value={roleLabel ?? ''} disabled className="h-10" />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        <ResponsiveModalFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px]"
            disabled={savePending || !member}
            onClick={() => void handleSave()}
          >
            {savePending ? 'Saving…' : 'Save'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
