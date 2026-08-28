import { useEffect, useMemo, useState } from 'react';

import { Mail } from 'lucide-react';

import { ApplyTemplatePicker } from '@/features/dashboard/team/components/ApplyTemplatePicker';
import {
  emptyOrgListingAssignments,
  OrgListingAssignmentPicker,
  type OrgListingAssignments,
} from '@/features/dashboard/team/components/OrgListingAssignmentPicker';
import { PermissionsTreeView } from '@/features/dashboard/team/components/PermissionsTreeView';
import { RoleSelectOptions } from '@/features/dashboard/team/components/RoleSelectOptions';
import { ORG_PERMISSION_CATALOG } from '@/features/dashboard/team/lib/orgPermissionCatalog';
import { getOrgRolePermissions } from '@/features/dashboard/team/lib/orgTeamRoles';
import { sortOrgTemplatesForDisplay } from '@/features/dashboard/team/lib/orgTeamTemplates';
import { handleRoleSelectChange } from '@/features/dashboard/team/lib/roleSelectUtils';
import { getRoleLabelForScope } from '@/features/dashboard/team/lib/teamRoleHelpers';
import {
  canSubmitTeamInvite,
  teamInvitePhoneError,
} from '@/features/dashboard/team/lib/teamInviteContact';
import {
  TEAM_INVITE_GMAIL_ONLY_MESSAGE,
  teamInviteEmailLooksInvalid,
} from '@/features/dashboard/team/lib/teamInviteEmail';
import type { CustomOrgRole, OrgRoleId } from '@/features/dashboard/team/types/orgTeam';
import { defaultOrgInviteTemplateId } from '@/features/dashboard/team/lib/orgTeamRoles';

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

export type OrgInviteFormState = {
  email: string;
  contactPhone: string;
  roleId: OrgRoleId;
  permissions: string[];
  allListings: boolean;
  listingAssignments: OrgListingAssignments;
};

type Props = {
  open: boolean;
  orgSlug: string;
  customRoles: CustomOrgRole[];
  onOpenChange: (open: boolean) => void;
  form: OrgInviteFormState;
  onFormChange: (patch: Partial<OrgInviteFormState>) => void;
  onSubmit: () => void;
  submitPending?: boolean;
  onAddCustomRole?: () => void;
  showAddCustomRole?: boolean;
};

export function OrgInviteMemberDialog({
  open,
  orgSlug,
  customRoles,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  submitPending = false,
  onAddCustomRole,
  showAddCustomRole = false,
}: Props) {
  const [sensitivePendingId, setSensitivePendingId] = useState<string | null>(null);
  const [sensitiveResolver, setSensitiveResolver] = useState<((ok: boolean) => void) | null>(null);

  const sortedRoles = useMemo(() => sortOrgTemplatesForDisplay(customRoles), [customRoles]);
  const listingSelectionValid =
    form.allListings ||
    form.listingAssignments.properties.length > 0 ||
    form.listingAssignments.parkings.length > 0;

  const emailInvalid = teamInviteEmailLooksInvalid(form.email);
  const phoneError = form.contactPhone.trim() ? teamInvitePhoneError(form.contactPhone) : null;
  const canSubmit =
    canSubmitTeamInvite({ email: form.email, contactPhone: form.contactPhone }, submitPending) &&
    listingSelectionValid &&
    form.permissions.length > 0;

  useEffect(() => {
    if (!open) return;
    if (form.permissions.length > 0) return;
    onFormChange({
      permissions: getOrgRolePermissions(form.roleId, customRoles),
    });
  }, [open, form.permissions.length, form.roleId, customRoles, onFormChange]);

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

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent
          sheetLayout="split"
          className="flex max-h-[min(92dvh,52rem)] w-[min(calc(100vw-1.5rem),48rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(95vw,48rem)] sm:p-0"
        >
          <ResponsiveModalHeader className="border-border/60 shrink-0 border-b px-4 py-3 sm:px-5 sm:py-4">
            <ResponsiveModalTitle className="pr-8 text-base sm:text-lg">
              Invite Team Member
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-invite-email">Email</Label>
                <Input
                  id="org-invite-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="user@gmail.com"
                  value={form.email}
                  onChange={(e) => onFormChange({ email: e.target.value })}
                  className={cn('h-10', emailInvalid && 'border-destructive')}
                  aria-invalid={emailInvalid}
                />
                {emailInvalid ? (
                  <p className="text-destructive text-sm" role="alert">
                    {TEAM_INVITE_GMAIL_ONLY_MESSAGE}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-invite-contact-phone">Phone</Label>
                <Input
                  id="org-invite-contact-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.contactPhone}
                  onChange={(e) => onFormChange({ contactPhone: e.target.value })}
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
                <Label htmlFor="org-invite-role">Org role</Label>
                <Select
                  value={form.roleId}
                  onValueChange={(value) => {
                    handleRoleSelectChange(
                      value,
                      (roleId) => {
                        onFormChange({
                          roleId,
                          permissions: getOrgRolePermissions(roleId, customRoles),
                        });
                      },
                      onAddCustomRole
                    );
                  }}
                >
                  <SelectTrigger id="org-invite-role" className="h-10">
                    <SelectValue>
                      {getRoleLabelForScope('org', form.roleId, customRoles)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <RoleSelectOptions
                      scope="org"
                      customRoles={sortedRoles}
                      showAddCustomRole={showAddCustomRole}
                      templatesOnly={false}
                    />
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Org permissions</Label>
                {sortedRoles.length > 0 ? (
                  <ApplyTemplatePicker
                    permissions={form.permissions}
                    templates={sortedRoles}
                    permissionsOnly
                    onApply={(_roleId, nextPermissions) => {
                      onFormChange({ permissions: nextPermissions });
                    }}
                  />
                ) : null}
                <PermissionsTreeView
                  permissions={form.permissions}
                  onChange={(permissions) => onFormChange({ permissions })}
                  catalog={ORG_PERMISSION_CATALOG}
                  onSensitiveEnable={requestSensitiveEnable}
                />
              </div>

              <OrgListingAssignmentPicker
                orgSlug={orgSlug}
                allListings={form.allListings}
                assignments={form.listingAssignments}
                onAllListingsChange={(allListings) => onFormChange({ allListings })}
                onAssignmentsChange={(listingAssignments) => onFormChange({ listingAssignments })}
              />
            </div>
          </div>

          <ResponsiveModalFooter className="border-border/60 shrink-0 gap-2 border-t px-4 py-3 sm:px-5">
            <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="min-h-[44px]" onClick={onSubmit} disabled={!canSubmit}>
              <Mail className="mr-2 size-4" aria-hidden />
              Send Invitation
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

export function defaultOrgInviteForm(customRoles: CustomOrgRole[] = []): OrgInviteFormState {
  const roleId = defaultOrgInviteTemplateId(customRoles);
  return {
    email: '',
    contactPhone: '',
    roleId,
    permissions: getOrgRolePermissions(roleId, customRoles),
    allListings: false,
    listingAssignments: emptyOrgListingAssignments(),
  };
}

export function defaultOrgInviteRoleId(customRoles: CustomOrgRole[] = []): OrgRoleId {
  return defaultOrgInviteTemplateId(customRoles);
}
