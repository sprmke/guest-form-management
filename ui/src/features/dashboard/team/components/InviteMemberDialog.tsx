import { Mail } from 'lucide-react';

import { RoleSelectOptions } from '@/features/dashboard/team/components/RoleSelectOptions';
import { handleRoleSelectChange } from '@/features/dashboard/team/lib/roleSelectUtils';
import {
  canSubmitTeamInvite,
  teamInvitePhoneError,
} from '@/features/dashboard/team/lib/teamInviteContact';
import {
  TEAM_INVITE_GMAIL_ONLY_MESSAGE,
  teamInviteEmailLooksInvalid,
} from '@/features/dashboard/team/lib/teamInviteEmail';
import { getRoleLabelForScope } from '@/features/dashboard/team/lib/teamRoleHelpers';
import { getTeamScopeConfig, type TeamScope } from '@/features/dashboard/team/lib/teamScopeConfig';
import type {
  BuiltinPropertyRole,
  CustomPropertyRole,
  PropertyRoleId,
} from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

type Props = {
  scope?: TeamScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  contactPhone: string;
  roleId: PropertyRoleId;
  customRoles: CustomPropertyRole[];
  onEmailChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onRoleChange: (roleId: PropertyRoleId) => void;
  onAddCustomRole?: () => void;
  showAddCustomRole?: boolean;
  builtinRoles?: Array<{ value: string; label: string }>;
  onSubmit: () => void;
  submitPending?: boolean;
};

export function InviteMemberDialog({
  scope = 'property',
  open,
  onOpenChange,
  email,
  contactPhone,
  roleId,
  customRoles,
  onEmailChange,
  onContactPhoneChange,
  onRoleChange,
  onAddCustomRole,
  showAddCustomRole = false,
  builtinRoles = getTeamScopeConfig(scope).builtinRoles,
  onSubmit,
  submitPending = false,
}: Props) {
  const emailInvalid = teamInviteEmailLooksInvalid(email);
  const phoneError = contactPhone.trim() ? teamInvitePhoneError(contactPhone) : null;
  const canSubmit = canSubmitTeamInvite({ email, contactPhone }, submitPending);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-h-[min(90dvh,40rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Invite Team Member</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="user@gmail.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className={cn('h-10', emailInvalid && 'border-destructive')}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? 'invite-email-error' : undefined}
            />
            {emailInvalid ? (
              <p id="invite-email-error" className="text-destructive text-sm" role="alert">
                {TEAM_INVITE_GMAIL_ONLY_MESSAGE}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-contact-phone">Phone</Label>
            <Input
              id="invite-contact-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder={FORM_PLACEHOLDERS.phone}
              className={cn('h-10 tabular-nums', phoneError && 'border-destructive')}
              aria-invalid={Boolean(phoneError)}
            />
            {phoneError ? (
              <p className="text-destructive text-sm" role="alert">
                {phoneError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={roleId}
              onValueChange={(value) =>
                handleRoleSelectChange(value, onRoleChange, onAddCustomRole)
              }
            >
              <SelectTrigger id="invite-role" className="h-10">
                <SelectValue>{getRoleLabelForScope(scope, roleId, customRoles)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <RoleSelectOptions
                  scope={scope}
                  customRoles={customRoles}
                  builtinRoles={builtinRoles}
                  showAddCustomRole={showAddCustomRole}
                />
              </SelectContent>
            </Select>
          </div>
        </div>
        <ResponsiveModalFooter className="gap-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <Mail className="mr-2 size-4" aria-hidden />
            Send Invitation
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

export function defaultInviteRoleId(): BuiltinPropertyRole {
  return 'STAFF';
}
