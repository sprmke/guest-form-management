import type { ReactNode } from 'react';

import { Mail } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type { AppSettingsFormValues } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyEmailAutomationTogglePanel } from '@/features/dashboard/org/components/property-settings/PropertyEmailAutomationTogglePanel';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { DEFAULT_RESIDENCE_NAME } from '@/features/dashboard/org/lib/propertyDisplay';
import type { PropertyAutomationToggleKey } from '@/features/dashboard/org/lib/propertyEmailAutomation';
import { SD_REFUND_CRON_EMAIL_LEAD_MAX_HOURS } from '@/features/dashboard/org/lib/propertyEmailAutomation';
import { getEmailAutomationDefaults } from '@/features/dashboard/org/lib/propertyEmailAutomationDefaults';

import { Input } from '@/components/ui/input';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

function SettingsSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {title}
        </h3>
        {description ? (
          <p className="text-muted-foreground text-xs leading-snug">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SettingsDivider() {
  return <div className="border-border/50 border-t" role="presentation" />;
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5 lg:grid-cols-2 lg:gap-x-5">
      {children}
    </div>
  );
}

function FieldSpan({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 lg:col-span-2">{children}</div>;
}

export function PropertyEmailAutomationsSection({
  draft,
  residenceName,
  disabled,
  resolveFieldError,
  markFieldInteracted,
  onChange,
  onAutomationToggleChange,
}: {
  draft: AppSettingsFormValues;
  residenceName: string;
  disabled: boolean;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  onChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
  onAutomationToggleChange: (key: PropertyAutomationToggleKey, value: boolean) => void;
}) {
  const effectiveResidence = residenceName.trim() || DEFAULT_RESIDENCE_NAME;
  const copy = getEmailAutomationDefaults(effectiveResidence);
  const fieldError = resolveFieldError;

  const setField = <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K],
    fieldId: string
  ) => {
    markFieldInteracted(fieldId);
    onChange(key, value);
  };

  return (
    <AdminSection
      id="email-automations"
      title="Email automations"
      icon={Mail}
      description="Recipients, check-out timing, and on/off switches for automated emails on this property."
    >
      <div className="space-y-6">
        <SettingsSubsection
          title="Recipients"
          description="Who receives team and partner workflow emails. Guest emails use the address on each booking."
        >
          <FieldGrid>
            <SettingsField
              id="email-reply-to"
              label={copy.propertyEmailLabel}
              hintBelow={copy.propertyEmailHint}
              required
              error={fieldError('email-reply-to')}
            >
              <Input
                id="email-reply-to"
                type="email"
                autoComplete="off"
                disabled={disabled}
                value={draft.emailReplyTo}
                onChange={(event) => setField('emailReplyTo', event.target.value, 'email-reply-to')}
                placeholder={copy.propertyEmailPlaceholder}
                className={cn('h-10', fieldError('email-reply-to') && 'border-destructive')}
                aria-invalid={Boolean(fieldError('email-reply-to'))}
              />
            </SettingsField>
            <FieldSpan>
              <SettingsField
                id="parking-owner-emails"
                label="Parking owners"
                hintBelow="Comma-separated BCC list for parking broadcast emails."
                error={fieldError('parking-owner-emails')}
              >
                <Input
                  id="parking-owner-emails"
                  disabled={disabled}
                  value={draft.parkingOwnerEmails}
                  onChange={(event) =>
                    setField('parkingOwnerEmails', event.target.value, 'parking-owner-emails')
                  }
                  placeholder={FORM_PLACEHOLDERS.orgParkingOwners}
                  className={cn('h-10', fieldError('parking-owner-emails') && 'border-destructive')}
                  aria-invalid={Boolean(fieldError('parking-owner-emails'))}
                />
              </SettingsField>
            </FieldSpan>
          </FieldGrid>
        </SettingsSubsection>

        <SettingsDivider />

        <SettingsSubsection
          title="Check-out timing & defaults"
          description="Controls when the guest check-out email sends and the default parking rate for new bookings."
        >
          <FieldGrid>
            <SettingsField
              id="sd-lead-hours"
              label="SD refund email lead (hours)"
              hintBelow="Hours before checkout the guest receives the check-out and SD refund email."
              error={fieldError('sd-lead-hours')}
            >
              <Input
                id="sd-lead-hours"
                type="number"
                min={0}
                max={SD_REFUND_CRON_EMAIL_LEAD_MAX_HOURS}
                step={0.5}
                disabled={disabled}
                value={draft.sdRefundCronEmailLeadHours}
                onChange={(event) =>
                  setField(
                    'sdRefundCronEmailLeadHours',
                    Number(event.target.value) || 0,
                    'sd-lead-hours'
                  )
                }
                placeholder={FORM_PLACEHOLDERS.orgSdRefundLeadHours}
                className={cn('h-10', fieldError('sd-lead-hours') && 'border-destructive')}
                aria-invalid={Boolean(fieldError('sd-lead-hours'))}
              />
            </SettingsField>
            <SettingsField
              id="sd-max-age"
              label="Days after checkout to stop guest emails"
              hintBelow="Skips automated check-out emails for stale stays. 0 = no limit."
              error={fieldError('sd-max-age')}
            >
              <Input
                id="sd-max-age"
                type="number"
                min={0}
                max={365}
                disabled={disabled}
                value={draft.sdRefundCronMaxCheckoutAgeDays}
                onChange={(event) =>
                  setField(
                    'sdRefundCronMaxCheckoutAgeDays',
                    Number(event.target.value) || 0,
                    'sd-max-age'
                  )
                }
                placeholder={FORM_PLACEHOLDERS.orgStaleCheckoutEmailCutoffDays}
                className={cn('h-10', fieldError('sd-max-age') && 'border-destructive')}
                aria-invalid={Boolean(fieldError('sd-max-age'))}
              />
            </SettingsField>
          </FieldGrid>
        </SettingsSubsection>

        <SettingsDivider />

        <SettingsSubsection title="Automated sends">
          <PropertyEmailAutomationTogglePanel
            draft={draft}
            disabled={disabled}
            onToggleChange={onAutomationToggleChange}
          />
        </SettingsSubsection>
      </div>
    </AdminSection>
  );
}
